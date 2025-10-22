/**
 * Rate Limiting Middleware
 * 
 * Protects against:
 * - Brute force attacks on login endpoints
 * - API spam/abuse
 * - Webhook flooding
 * - DDoS attempts
 * 
 * Uses Redis for distributed rate limiting across multiple instances
 */

import redis from "./redis";
import { NextRequest, NextResponse } from "next/server";

// Rate limit configuration
export const RATE_LIMITS = {
  // Authentication endpoints - strict limits
  AUTH_LOGIN: {
    points: 5,           // Max 5 attempts
    duration: 900,       // Per 15 minutes (900 seconds)
    blockDuration: 1800, // Block for 30 minutes after exceeding
  },
  AUTH_SIGNUP: {
    points: 3,           // Max 3 signups
    duration: 3600,      // Per hour
    blockDuration: 3600, // Block for 1 hour
  },
  
  // API endpoints - moderate limits
  API_READ: {
    points: 100,         // Max 100 requests
    duration: 60,        // Per minute
    blockDuration: 300,  // Block for 5 minutes
  },
  API_WRITE: {
    points: 30,          // Max 30 requests
    duration: 60,        // Per minute
    blockDuration: 600,  // Block for 10 minutes
  },
  API_MESSAGE_SEND: {
    points: 60,          // Max 60 messages
    duration: 60,        // Per minute
    blockDuration: 1800, // Block for 30 minutes
  },
  
  // Webhook endpoints - higher limits but still protected
  WEBHOOK: {
    points: 1000,        // Max 1000 webhooks
    duration: 60,        // Per minute
    blockDuration: 300,  // Block for 5 minutes
  },
  
  // File upload - very strict
  FILE_UPLOAD: {
    points: 10,          // Max 10 uploads
    duration: 3600,      // Per hour
    blockDuration: 3600, // Block for 1 hour
  },
  
  // Dashboard stats - moderate
  DASHBOARD: {
    points: 50,          // Max 50 requests
    duration: 60,        // Per minute
    blockDuration: 300,  // Block for 5 minutes
  },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

/**
 * Get identifier for rate limiting
 * Priority: User ID > IP Address > Anonymous
 */
export function getIdentifier(request: NextRequest, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Get IP from various headers (supports proxies/load balancers)
  const ip = 
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0] ||
    request.headers.get("cf-connecting-ip") || // Cloudflare
    request.headers.get("x-client-ip") ||
    "anonymous";
  
  return `ip:${ip}`;
}

/**
 * Check if identifier is in whitelist
 */
async function isWhitelisted(identifier: string): Promise<boolean> {
  try {
    const whitelisted = await redis.sismember("ratelimit:whitelist", identifier);
    return whitelisted === 1;
  } catch (error) {
    console.error("Error checking whitelist:", error);
    return false;
  }
}

/**
 * Check if identifier is in blacklist
 */
async function isBlacklisted(identifier: string): Promise<boolean> {
  try {
    const blacklisted = await redis.sismember("ratelimit:blacklist", identifier);
    return blacklisted === 1;
  } catch (error) {
    console.error("Error checking blacklist:", error);
    return false;
  }
}

/**
 * Check rate limit for a request
 */
export async function checkRateLimit(
  identifier: string,
  limitType: RateLimitType
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[limitType];
  const key = `ratelimit:${limitType}:${identifier}`;
  
  try {
    // Check whitelist (bypass rate limits)
    if (await isWhitelisted(identifier)) {
      console.log(`✅ Rate limit bypassed (whitelisted): ${identifier}`);
      return {
        success: true,
        limit: config.points,
        remaining: config.points,
        reset: new Date(Date.now() + config.duration * 1000),
      };
    }
    
    // Check blacklist (always block)
    if (await isBlacklisted(identifier)) {
      console.warn(`⛔ Access denied (blacklisted): ${identifier}`);
      return {
        success: false,
        limit: config.points,
        remaining: 0,
        reset: new Date(Date.now() + 86400 * 1000), // 24 hours
        retryAfter: 86400,
      };
    }
    
    // Check if blocked
    const blockKey = `${key}:blocked`;
    const blocked = await redis.get(blockKey);
    
    if (blocked) {
      const ttl = await redis.ttl(blockKey);
      console.warn(`🚫 Rate limit blocked: ${identifier} (${limitType})`);
      return {
        success: false,
        limit: config.points,
        remaining: 0,
        reset: new Date(Date.now() + ttl * 1000),
        retryAfter: ttl,
      };
    }
    
    // Get current count
    const current = await redis.get(key);
    const count = current ? parseInt(current, 10) : 0;
    
    // Check if limit exceeded
    if (count >= config.points) {
      // Block the identifier
      await redis.setex(blockKey, config.blockDuration, "1");
      
      // Log the block
      await logRateLimitViolation(identifier, limitType, count);
      
      console.warn(`⚠️ Rate limit exceeded: ${identifier} (${limitType}) - BLOCKED for ${config.blockDuration}s`);
      
      return {
        success: false,
        limit: config.points,
        remaining: 0,
        reset: new Date(Date.now() + config.blockDuration * 1000),
        retryAfter: config.blockDuration,
      };
    }
    
    // Increment counter
    const newCount = await redis.incr(key);
    
    // Set expiry on first request
    if (newCount === 1) {
      await redis.expire(key, config.duration);
    }
    
    // Get TTL for reset time
    const ttl = await redis.ttl(key);
    
    return {
      success: true,
      limit: config.points,
      remaining: config.points - newCount,
      reset: new Date(Date.now() + ttl * 1000),
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // Fail open (allow request) if Redis is down
    return {
      success: true,
      limit: config.points,
      remaining: config.points,
      reset: new Date(Date.now() + config.duration * 1000),
    };
  }
}

/**
 * Log rate limit violations for monitoring
 */
async function logRateLimitViolation(
  identifier: string,
  limitType: RateLimitType,
  attempts: number
): Promise<void> {
  try {
    const logKey = "ratelimit:violations";
    const violation = {
      identifier,
      limitType,
      attempts,
      timestamp: new Date().toISOString(),
    };
    
    // Store last 1000 violations
    await redis.lpush(logKey, JSON.stringify(violation));
    await redis.ltrim(logKey, 0, 999);
    
    // Increment violation counter
    const violationCountKey = `ratelimit:violations:count:${identifier}`;
    const violationCount = await redis.incr(violationCountKey);
    await redis.expire(violationCountKey, 86400); // 24 hours
    
    // Auto-blacklist after 10 violations in 24 hours
    if (violationCount >= 10) {
      await redis.sadd("ratelimit:blacklist", identifier);
      console.error(`🚨 AUTO-BLACKLISTED: ${identifier} (${violationCount} violations)`);
    }
  } catch (error) {
    console.error("Error logging rate limit violation:", error);
  }
}

/**
 * Rate limit middleware wrapper
 */
export async function withRateLimit(
  request: NextRequest,
  limitType: RateLimitType,
  userId?: string
) {
  const identifier = getIdentifier(request, userId);
  const result = await checkRateLimit(identifier, limitType);
  
  if (!result.success) {
    return NextResponse.json(
      {
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${result.retryAfter} seconds.`,
        limitType,
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": result.reset.toISOString(),
          "Retry-After": result.retryAfter?.toString() || "60",
        },
      }
    );
  }
  
  // Return headers to include in successful responses
  return {
    headers: {
      "X-RateLimit-Limit": result.limit.toString(),
      "X-RateLimit-Remaining": result.remaining.toString(),
      "X-RateLimit-Reset": result.reset.toISOString(),
    },
  };
}

/**
 * Reset rate limit for an identifier (admin use)
 */
export async function resetRateLimit(
  identifier: string,
  limitType?: RateLimitType
): Promise<void> {
  try {
    if (limitType) {
      const key = `ratelimit:${limitType}:${identifier}`;
      const blockKey = `${key}:blocked`;
      await redis.del(key, blockKey);
      console.log(`🔄 Reset rate limit: ${identifier} (${limitType})`);
    } else {
      // Reset all limits for identifier
      const pattern = `ratelimit:*:${identifier}*`;
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`🔄 Reset all rate limits: ${identifier} (${keys.length} keys)`);
      }
    }
  } catch (error) {
    console.error("Error resetting rate limit:", error);
    throw error;
  }
}

/**
 * Add identifier to whitelist (bypass rate limits)
 */
export async function addToWhitelist(identifier: string): Promise<void> {
  try {
    await redis.sadd("ratelimit:whitelist", identifier);
    console.log(`✅ Added to whitelist: ${identifier}`);
  } catch (error) {
    console.error("Error adding to whitelist:", error);
    throw error;
  }
}

/**
 * Remove identifier from whitelist
 */
export async function removeFromWhitelist(identifier: string): Promise<void> {
  try {
    await redis.srem("ratelimit:whitelist", identifier);
    console.log(`➖ Removed from whitelist: ${identifier}`);
  } catch (error) {
    console.error("Error removing from whitelist:", error);
    throw error;
  }
}

/**
 * Add identifier to blacklist (always block)
 */
export async function addToBlacklist(identifier: string): Promise<void> {
  try {
    await redis.sadd("ratelimit:blacklist", identifier);
    console.log(`⛔ Added to blacklist: ${identifier}`);
  } catch (error) {
    console.error("Error adding to blacklist:", error);
    throw error;
  }
}

/**
 * Remove identifier from blacklist
 */
export async function removeFromBlacklist(identifier: string): Promise<void> {
  try {
    await redis.srem("ratelimit:blacklist", identifier);
    console.log(`✅ Removed from blacklist: ${identifier}`);
  } catch (error) {
    console.error("Error removing from blacklist:", error);
    throw error;
  }
}

/**
 * Get rate limit statistics
 */
export async function getRateLimitStats() {
  try {
    const [violations, whitelist, blacklist] = await Promise.all([
      redis.lrange("ratelimit:violations", 0, 99),
      redis.smembers("ratelimit:whitelist"),
      redis.smembers("ratelimit:blacklist"),
    ]);
    
    return {
      recentViolations: violations.map(v => JSON.parse(v)),
      whitelist,
      blacklist,
      violationCount: violations.length,
      whitelistCount: whitelist.length,
      blacklistCount: blacklist.length,
    };
  } catch (error) {
    console.error("Error getting rate limit stats:", error);
    return {
      recentViolations: [],
      whitelist: [],
      blacklist: [],
      violationCount: 0,
      whitelistCount: 0,
      blacklistCount: 0,
    };
  }
}

/**
 * Helper: Create rate limited response with standard headers
 */
export function createRateLimitResponse(
  data: any,
  rateLimitHeaders: { headers: Record<string, string> }
) {
  return NextResponse.json(data, {
    headers: rateLimitHeaders.headers,
  });
}

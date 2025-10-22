/**
 * Cache Invalidation Utilities
 * 
 * Provides functions to invalidate cached data when the underlying data changes.
 * This ensures users always see up-to-date information after key actions.
 */

import redis from "./redis";

/**
 * Invalidate dashboard stats cache for a specific company
 * Call this when:
 * - New message is sent
 * - New conversation is created
 * - Conversation status changes
 */
export async function invalidateDashboardStatsCache(companyId: string): Promise<void> {
  try {
    const cacheKey = `dashboard:stats:${companyId}`;
    const result = await redis.del(cacheKey);
    
    if (result > 0) {
      console.log(`🗑️  Invalidated dashboard stats cache for company: ${companyId}`);
    }
  } catch (error) {
    console.error("Cache invalidation error:", error);
    // Don't throw - cache invalidation failure shouldn't break the app
  }
}

/**
 * Invalidate multiple cache keys at once
 * Useful for bulk operations
 */
export async function invalidateMultipleCaches(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  
  try {
    const result = await redis.del(...keys);
    console.log(`🗑️  Invalidated ${result} cache keys`);
  } catch (error) {
    console.error("Bulk cache invalidation error:", error);
  }
}

/**
 * Get all dashboard stats cache keys
 * Useful for debugging or mass invalidation
 */
export async function getDashboardCacheKeys(): Promise<string[]> {
  try {
    return await redis.keys("dashboard:stats:*");
  } catch (error) {
    console.error("Error getting cache keys:", error);
    return [];
  }
}

/**
 * Invalidate all dashboard stats caches (all companies)
 * Use sparingly - typically only for system-wide updates
 */
export async function invalidateAllDashboardCaches(): Promise<void> {
  try {
    const keys = await getDashboardCacheKeys();
    if (keys.length > 0) {
      await invalidateMultipleCaches(keys);
      console.log(`🗑️  Invalidated all dashboard caches (${keys.length} companies)`);
    }
  } catch (error) {
    console.error("Error invalidating all dashboard caches:", error);
  }
}

/**
 * Get cache statistics
 * Useful for monitoring cache performance
 */
export async function getCacheStats(): Promise<{
  totalKeys: number;
  dashboardKeys: number;
  memoryUsed?: string;
}> {
  try {
    const allKeys = await redis.keys("*");
    const dashboardKeys = allKeys.filter(key => key.startsWith("dashboard:"));
    
    // Get memory info (if available)
    let memoryUsed: string | undefined;
    try {
      const info = await redis.info("memory");
      const match = info.match(/used_memory_human:([^\r\n]+)/);
      if (match) {
        memoryUsed = match[1];
      }
    } catch (e) {
      // Memory info not available
    }
    
    return {
      totalKeys: allKeys.length,
      dashboardKeys: dashboardKeys.length,
      memoryUsed,
    };
  } catch (error) {
    console.error("Error getting cache stats:", error);
    return {
      totalKeys: 0,
      dashboardKeys: 0,
    };
  }
}

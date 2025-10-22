# 🧪 Rate Limiting Testing Guide

## Overview

This guide helps you test and verify the rate limiting implementation across all protected endpoints.

## Quick Test

Run the automated test script:

```bash
# Test registration rate limit (3 per hour)
node test-rate-limiting.js register

# Test dashboard rate limit (50 per minute) 
node test-rate-limiting.js dashboard

# Test webhook rate limit (1000 per minute)
node test-rate-limiting.js webhook
```

## Manual Testing

### 1. Test Login Rate Limiting

**Endpoint:** `POST /api/auth/[...nextauth]`
**Limit:** 5 attempts per 15 minutes
**Block Duration:** 30 minutes

```bash
# Try to login 6 times with wrong password
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/callback/credentials \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}' \
    -v
  echo "\n--- Request $i complete ---\n"
  sleep 1
done
```

**Expected:**
- First 5 requests: Return authentication error
- 6th request: Return 429 Too Many Requests with `Retry-After` header

### 2. Test Registration Rate Limiting

**Endpoint:** `POST /api/auth/register`
**Limit:** 3 signups per hour
**Block Duration:** 1 hour

```bash
# Try to register 4 users
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user1@test.com","password":"Test123!@#","name":"User 1"}' \
  -v

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user2@test.com","password":"Test123!@#","name":"User 2"}' \
  -v

curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user3@test.com","password":"Test123!@#","name":"User 3"}' \
  -v

# This one should be rate limited
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user4@test.com","password":"Test123!@#","name":"User 4"}' \
  -v
```

**Expected:**
- First 3 requests: Success or duplicate error
- 4th request: 429 Too Many Requests

### 3. Test Message Send Rate Limiting

**Endpoint:** `POST /api/messages/send`
**Limit:** 60 messages per minute
**Block Duration:** 30 minutes

```bash
# Send 61 messages rapidly (requires authentication)
for i in {1..61}; do
  curl -X POST http://localhost:3000/api/messages/send \
    -H "Content-Type: application/json" \
    -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
    -d '{"conversationId":"CONVERSATION_ID","text":"Test message '$i'"}' \
    -v
  echo "\n--- Message $i sent ---\n"
done
```

**Expected:**
- First 60 requests: Success
- 61st request: 429 Too Many Requests

### 4. Test Dashboard Rate Limiting

**Endpoint:** `GET /api/dashboard/stats`
**Limit:** 50 requests per minute
**Block Duration:** 5 minutes

```bash
# Request dashboard stats 51 times (requires authentication)
for i in {1..51}; do
  curl -X GET http://localhost:3000/api/dashboard/stats \
    -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
    -v
  echo "\n--- Request $i complete ---\n"
done
```

**Expected:**
- First 50 requests: Success
- 51st request: 429 Too Many Requests

### 5. Test File Upload Rate Limiting

**Endpoint:** `POST /api/training/upload` or `POST /api/settings/profile/photo`
**Limit:** 10 uploads per hour
**Block Duration:** 1 hour

```bash
# Try to upload 11 files (requires authentication)
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/settings/profile/photo \
    -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
    -F "photo=@test-image.jpg" \
    -v
  echo "\n--- Upload $i complete ---\n"
  sleep 1
done
```

**Expected:**
- First 10 requests: Success
- 11th request: 429 Too Many Requests

### 6. Test Webhook Rate Limiting

**Endpoint:** `POST /api/webhook/facebook` (also Instagram, Telegram)
**Limit:** 1000 webhooks per minute
**Block Duration:** 5 minutes

```bash
# Send 1001 webhook events
for i in {1..1001}; do
  curl -X POST http://localhost:3000/api/webhook/facebook \
    -H "Content-Type: application/json" \
    -d '{"object":"page","entry":[]}' \
    -v
done
```

**Expected:**
- First 1000 requests: Success (signature verification may fail, but rate limit passes)
- 1001st request: 429 Too Many Requests

## Check Rate Limit Headers

All successful responses include rate limit headers:

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-01-20T10:30:00.000Z
```

Rate limited responses (429) include:

```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-01-20T10:35:00.000Z
Retry-After: 300
```

## Admin Management Testing

### Get Rate Limit Statistics

```bash
curl -X GET http://localhost:3000/api/admin/rate-limit \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -v
```

**Expected Response:**
```json
{
  "success": true,
  "stats": {
    "recentViolations": [...],
    "whitelist": [...],
    "blacklist": [...],
    "violationCount": 5,
    "whitelistCount": 2,
    "blacklistCount": 1
  }
}
```

### Reset Rate Limit

```bash
curl -X POST http://localhost:3000/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -d '{
    "action": "reset",
    "identifier": "ip:192.168.1.100",
    "limitType": "AUTH_LOGIN"
  }' \
  -v
```

### Add to Whitelist

```bash
curl -X POST http://localhost:3000/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -d '{
    "action": "whitelist_add",
    "identifier": "ip:192.168.1.100"
  }' \
  -v
```

### Add to Blacklist

```bash
curl -X POST http://localhost:3000/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -d '{
    "action": "blacklist_add",
    "identifier": "ip:198.51.100.42"
  }' \
  -v
```

### Remove from Whitelist

```bash
curl -X POST http://localhost:3000/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -d '{
    "action": "whitelist_remove",
    "identifier": "ip:192.168.1.100"
  }' \
  -v
```

### Remove from Blacklist

```bash
curl -X POST http://localhost:3000/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -d '{
    "action": "blacklist_remove",
    "identifier": "ip:198.51.100.42"
  }' \
  -v
```

## Verify Redis Keys

Check what's stored in Redis:

```bash
# Connect to Redis
redis-cli

# View all rate limit keys
KEYS ratelimit:*

# Check specific rate limit
GET ratelimit:AUTH_LOGIN:ip:192.168.1.100

# Check if blocked
GET ratelimit:AUTH_LOGIN:ip:192.168.1.100:blocked
TTL ratelimit:AUTH_LOGIN:ip:192.168.1.100:blocked

# View whitelist
SMEMBERS ratelimit:whitelist

# View blacklist
SMEMBERS ratelimit:blacklist

# View recent violations
LRANGE ratelimit:violations 0 9
```

## Common Issues & Troubleshooting

### Issue 1: Rate limiting not working

**Possible causes:**
- Redis not running
- Redis connection failed
- Rate limit middleware not applied

**Check:**
```bash
# Test Redis connection
redis-cli ping
# Should return: PONG

# Check application logs for Redis errors
tail -f logs/app.log | grep -i redis
```

### Issue 2: Rate limit too strict/lenient

**Solution:**
Edit `src/lib/rate-limit.ts` and adjust the `RATE_LIMITS` configuration:

```typescript
export const RATE_LIMITS = {
  AUTH_LOGIN: {
    points: 10,          // Increase from 5 to 10
    duration: 900,       // Keep 15 minutes
    blockDuration: 1800, // Keep 30 minutes
  },
  // ... other limits
};
```

### Issue 3: User legitimately blocked

**Solution:**
Use admin API to reset their rate limit:

```bash
curl -X POST http://localhost:3000/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -d '{
    "action": "reset",
    "identifier": "user:USER_ID_HERE"
  }'
```

Or whitelist them:

```bash
curl -X POST http://localhost:3000/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -d '{
    "action": "whitelist_add",
    "identifier": "user:USER_ID_HERE"
  }'
```

### Issue 4: Auto-blacklist triggered incorrectly

**Solution:**
Check violation logs and remove from blacklist if legitimate:

```bash
# Check violations
curl -X GET http://localhost:3000/api/admin/rate-limit \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN"

# Remove from blacklist
curl -X POST http://localhost:3000/api/admin/rate-limit \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -d '{
    "action": "blacklist_remove",
    "identifier": "user:USER_ID_HERE"
  }'
```

## Success Criteria

Rate limiting is working correctly if:

1. ✅ Requests within limit succeed with rate limit headers
2. ✅ Requests exceeding limit return 429 with `Retry-After` header
3. ✅ Blocked identifiers remain blocked for the configured duration
4. ✅ Rate limits reset after the duration expires
5. ✅ Whitelisted identifiers bypass rate limits
6. ✅ Blacklisted identifiers are always blocked
7. ✅ Violations are logged in Redis
8. ✅ Auto-blacklist triggers after 10 violations
9. ✅ Admin API can manage whitelists/blacklists
10. ✅ Different endpoints have different rate limits

## Performance Verification

Verify rate limiting doesn't significantly impact performance:

```bash
# Benchmark without rate limiting (comment out middleware)
ab -n 1000 -c 10 http://localhost:3000/api/dashboard/stats

# Benchmark with rate limiting
ab -n 1000 -c 10 http://localhost:3000/api/dashboard/stats
```

**Expected:**
- Added latency: ~5-10ms per request
- Throughput: Minimal impact (< 5% reduction)

## Monitoring

Set up monitoring alerts for:
- High violation counts (possible attack)
- Auto-blacklist triggers
- Rate limit errors in logs
- Redis connection failures

Example alert query (if using monitoring service):
```
rate_limit_violations_count > 100 per 5 minutes
```

## Next Steps

After successful testing:

1. ✅ Verify all critical endpoints are protected
2. ✅ Configure production rate limits (may differ from dev)
3. ✅ Set up monitoring and alerts
4. ✅ Train team on admin management tools
5. ✅ Document incident response procedures
6. ✅ Consider CDN/WAF for additional protection
7. ✅ Review rate limits monthly based on usage patterns

## Summary

**Implemented Rate Limits:**

| Endpoint | Limit | Duration | Block Duration |
|----------|-------|----------|----------------|
| Login | 5 | 15 min | 30 min |
| Signup | 3 | 1 hour | 1 hour |
| Message Send | 60 | 1 min | 30 min |
| File Upload | 10 | 1 hour | 1 hour |
| Dashboard | 50 | 1 min | 5 min |
| Webhooks | 1000 | 1 min | 5 min |

**Protection Features:**
- ✅ User-based and IP-based rate limiting
- ✅ Whitelist/blacklist support
- ✅ Auto-blacklist after 10 violations
- ✅ Violation logging and monitoring
- ✅ Admin management API
- ✅ Graceful Redis failure handling
- ✅ Standard HTTP 429 responses

Your application now has enterprise-grade rate limiting protection! 🛡️

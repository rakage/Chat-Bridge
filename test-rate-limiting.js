/**
 * Rate Limiting Test Script
 * 
 * Tests rate limiting on various endpoints to verify implementation
 * 
 * Usage:
 *   node test-rate-limiting.js [endpoint]
 * 
 * Available endpoints:
 *   - register (default - tests AUTH_SIGNUP limit: 3 per hour)
 *   - dashboard (tests DASHBOARD limit: 50 per minute)
 *   - webhook (tests WEBHOOK limit: 1000 per minute)
 */

const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test configurations
const TESTS = {
  register: {
    name: 'Registration (AUTH_SIGNUP)',
    endpoint: '/api/auth/register',
    method: 'POST',
    limit: 3,
    duration: '1 hour',
    getData: (i) => ({
      email: `test${i}@example.com`,
      password: 'Test123!@#',
      name: `Test User ${i}`,
    }),
    description: 'Tests signup rate limit (3 attempts per hour)',
  },
  
  dashboard: {
    name: 'Dashboard Stats (DASHBOARD)',
    endpoint: '/api/dashboard/stats',
    method: 'GET',
    limit: 50,
    duration: '1 minute',
    requiresAuth: true,
    description: 'Tests dashboard rate limit (50 requests per minute)',
  },
  
  webhook: {
    name: 'Webhook (WEBHOOK)',
    endpoint: '/api/webhook/facebook',
    method: 'POST',
    limit: 1000,
    duration: '1 minute',
    getData: () => ({
      object: 'page',
      entry: [],
    }),
    description: 'Tests webhook rate limit (1000 webhooks per minute)',
  },
};

async function testRateLimit(testName = 'register') {
  const test = TESTS[testName];
  
  if (!test) {
    console.error(`❌ Unknown test: ${testName}`);
    console.log(`Available tests: ${Object.keys(TESTS).join(', ')}`);
    process.exit(1);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing: ${test.name}`);
  console.log(`📊 Expected Limit: ${test.limit} requests per ${test.duration}`);
  console.log(`📝 Description: ${test.description}`);
  console.log(`${'='.repeat(60)}\n`);

  let successCount = 0;
  let rateLimitedCount = 0;
  let errorCount = 0;
  let rateLimitHeaders = null;

  // Test slightly more than the limit to trigger rate limiting
  const testCount = test.limit + 5;

  for (let i = 1; i <= testCount; i++) {
    try {
      const config = {
        method: test.method,
        url: `${BASE_URL}${test.endpoint}`,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      // Add auth if required (you'll need to replace with actual token)
      if (test.requiresAuth) {
        // For testing, you might want to skip auth or use a test token
        console.log(`⚠️  Skipping test ${i}: Requires authentication`);
        continue;
      }

      // Add data if needed
      if (test.getData) {
        config.data = test.getData(i);
      }

      const response = await axios(config);

      // Extract rate limit headers
      rateLimitHeaders = {
        limit: response.headers['x-ratelimit-limit'],
        remaining: response.headers['x-ratelimit-remaining'],
        reset: response.headers['x-ratelimit-reset'],
      };

      successCount++;
      console.log(
        `✅ Request ${i}/${testCount}: Success (${rateLimitHeaders.remaining} remaining)`
      );
    } catch (error) {
      if (error.response?.status === 429) {
        rateLimitedCount++;
        const retryAfter = error.response.headers['retry-after'];
        console.log(
          `🚫 Request ${i}/${testCount}: RATE LIMITED! (Retry after ${retryAfter}s)`
        );
        
        // Extract headers even from error response
        rateLimitHeaders = {
          limit: error.response.headers['x-ratelimit-limit'],
          remaining: error.response.headers['x-ratelimit-remaining'],
          reset: error.response.headers['x-ratelimit-reset'],
        };
      } else if (error.response?.status === 400 && testName === 'register') {
        // Expected for duplicate emails in registration test
        successCount++;
        console.log(
          `✅ Request ${i}/${testCount}: Success (expected 400 for duplicate)`
        );
      } else {
        errorCount++;
        console.log(
          `❌ Request ${i}/${testCount}: Error (${error.response?.status || error.message})`
        );
      }
    }

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Test Results for ${test.name}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Successful requests: ${successCount}`);
  console.log(`🚫 Rate limited requests: ${rateLimitedCount}`);
  console.log(`❌ Error requests: ${errorCount}`);
  
  if (rateLimitHeaders) {
    console.log(`\n📋 Rate Limit Headers:`);
    console.log(`   Limit: ${rateLimitHeaders.limit}`);
    console.log(`   Remaining: ${rateLimitHeaders.remaining}`);
    console.log(`   Reset: ${rateLimitHeaders.reset ? new Date(rateLimitHeaders.reset).toLocaleString() : 'N/A'}`);
  }

  // Verify test passed
  console.log(`\n🎯 Test Status:`);
  if (successCount <= test.limit && rateLimitedCount > 0) {
    console.log(`   ✅ PASSED - Rate limiting is working correctly!`);
    console.log(`   - Allowed ${successCount} requests (limit: ${test.limit})`);
    console.log(`   - Blocked ${rateLimitedCount} requests after limit exceeded`);
  } else if (rateLimitedCount === 0) {
    console.log(`   ⚠️  WARNING - Rate limiting may not be working`);
    console.log(`   - All ${successCount} requests succeeded`);
    console.log(`   - Expected some requests to be blocked after ${test.limit}`);
  } else {
    console.log(`   ❓ UNCLEAR - Check results above`);
  }
  console.log(`${'='.repeat(60)}\n`);
}

// Run test
const testName = process.argv[2] || 'register';
testRateLimit(testName).catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});

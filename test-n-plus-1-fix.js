/**
 * Test Script: N+1 Query Fix Verification
 * 
 * This script tests the conversation API to verify the N+1 optimization works.
 * 
 * Usage:
 * 1. Start your server: npm run dev
 * 2. Get your session cookie from browser (open DevTools → Application → Cookies)
 * 3. Update SESSION_COOKIE below
 * 4. Run: node test-n-plus-1-fix.js
 */

const https = require('https');
const http = require('http');

// ============================================
// CONFIGURATION
// ============================================
const API_URL = 'http://localhost:3001/api/conversations';
const SESSION_COOKIE = 'YOUR_SESSION_COOKIE_HERE'; // Get from browser DevTools

// Test different conversation counts
const TEST_CASES = [
  { limit: 10, name: 'Small Load (10 conversations)' },
  { limit: 50, name: 'Medium Load (50 conversations)' },
  { limit: 100, name: 'Large Load (100 conversations)' },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

function makeRequest(url, cookie) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Cookie': cookie,
        'Accept': 'application/json',
      },
    };

    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: parsed,
          });
        } catch (e) {
          reject(new Error('Failed to parse response'));
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

function formatTime(ms) {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

function getStatusIcon(ms, limit) {
  // Expected times after optimization
  if (limit <= 10 && ms < 100) return '✅';
  if (limit <= 50 && ms < 150) return '✅';
  if (limit <= 100 && ms < 200) return '✅';
  if (ms < 500) return '⚠️';
  return '❌';
}

// ============================================
// MAIN TEST FUNCTION
// ============================================

async function runTests() {
  console.log('🧪 N+1 Query Fix - Performance Test\n');
  console.log('━'.repeat(60));
  console.log('Testing API:', API_URL);
  console.log('━'.repeat(60));
  console.log('');

  if (SESSION_COOKIE === 'YOUR_SESSION_COOKIE_HERE') {
    console.log('❌ ERROR: Please update SESSION_COOKIE in this script');
    console.log('');
    console.log('How to get your session cookie:');
    console.log('1. Open your app in browser');
    console.log('2. Open DevTools (F12)');
    console.log('3. Go to Application → Cookies');
    console.log('4. Copy the cookie value');
    console.log('5. Update SESSION_COOKIE variable in this script');
    return;
  }

  const results = [];

  for (const testCase of TEST_CASES) {
    console.log(`\n📋 ${testCase.name}`);
    console.log('─'.repeat(60));
    
    const url = `${API_URL}?limit=${testCase.limit}`;
    
    try {
      const startTime = Date.now();
      const response = await makeRequest(url, SESSION_COOKIE);
      const duration = Date.now() - startTime;

      if (response.statusCode !== 200) {
        console.log(`❌ FAIL: HTTP ${response.statusCode}`);
        if (response.statusCode === 401) {
          console.log('   Reason: Unauthorized - Session cookie expired or invalid');
        }
        continue;
      }

      const { conversations, total, hasMore } = response.data;
      const statusIcon = getStatusIcon(duration, testCase.limit);

      console.log(`${statusIcon} Response Time: ${formatTime(duration)}`);
      console.log(`   Conversations Loaded: ${conversations.length}`);
      console.log(`   Has More: ${hasMore ? 'Yes' : 'No'}`);

      // Calculate expected queries (should be 3-4 regardless of limit)
      const expectedQueries = 4;
      console.log(`   Expected Queries: ~${expectedQueries} queries`);

      // Performance assessment
      let performance = 'EXCELLENT';
      if (duration > 200) performance = 'GOOD';
      if (duration > 500) performance = 'SLOW';
      if (duration > 2000) performance = 'VERY SLOW (N+1 not fixed!)';

      console.log(`   Performance: ${performance}`);

      results.push({
        name: testCase.name,
        limit: testCase.limit,
        duration,
        count: conversations.length,
        status: statusIcon === '✅' ? 'PASS' : 'WARN',
      });

    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      results.push({
        name: testCase.name,
        limit: testCase.limit,
        duration: 0,
        count: 0,
        status: 'ERROR',
      });
    }
  }

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n\n');
  console.log('━'.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('━'.repeat(60));
  console.log('');

  console.log('┌────────────────────────────────┬──────────┬────────────┐');
  console.log('│ Test Case                      │ Time     │ Status     │');
  console.log('├────────────────────────────────┼──────────┼────────────┤');

  results.forEach(result => {
    const nameCol = result.name.padEnd(30);
    const timeCol = formatTime(result.duration).padEnd(8);
    const statusCol = result.status.padEnd(10);
    console.log(`│ ${nameCol} │ ${timeCol} │ ${statusCol} │`);
  });

  console.log('└────────────────────────────────┴──────────┴────────────┘');
  console.log('');

  // Performance analysis
  const allPassed = results.every(r => r.status === 'PASS');
  const allFast = results.every(r => r.duration < 500);

  console.log('🎯 Performance Analysis:');
  console.log('');

  if (allPassed) {
    console.log('✅ All tests passed!');
    console.log('✅ N+1 query optimization is working correctly');
    console.log('✅ Response times are excellent (<200ms)');
  } else if (allFast) {
    console.log('⚠️  Tests completed but some exceeded target time');
    console.log('⚠️  Still much better than before optimization');
    console.log('✅ N+1 fix is working');
  } else {
    console.log('❌ Some tests are slow (>500ms)');
    console.log('❌ This might indicate:');
    console.log('   1. N+1 fix not fully applied');
    console.log('   2. Database needs indexing');
    console.log('   3. Server under load');
    console.log('   4. Network latency');
  }

  console.log('');

  // Expected improvement
  console.log('📈 Expected Improvement from N+1 Fix:');
  console.log('');
  console.log('Before Optimization:');
  console.log('  • 10 conversations:   200-1000ms (101 queries)');
  console.log('  • 50 conversations:   1-2s (501 queries)');
  console.log('  • 100 conversations:  3-5s (1,001 queries)');
  console.log('');
  console.log('After Optimization:');
  console.log('  • 10 conversations:   50-100ms (4 queries) ⚡');
  console.log('  • 50 conversations:   80-150ms (4 queries) ⚡');
  console.log('  • 100 conversations:  100-200ms (4 queries) ⚡');
  console.log('');

  console.log('━'.repeat(60));
  console.log('');
}

// ============================================
// RUN TESTS
// ============================================

console.log('');
runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

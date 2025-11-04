/**
 * Check App-Level Webhook Subscriptions
 * 
 * Facebook requires BOTH app-level AND page-level subscriptions.
 * This script checks what your APP is subscribed to.
 * 
 * Run: node check-app-webhooks.js
 */

require('dotenv').config({ path: '.env.local' });

async function checkAppWebhooks() {
  const APP_ID = process.env.FACEBOOK_APP_ID;
  const APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  
  if (!APP_ID || !APP_SECRET) {
    console.error('❌ Missing FACEBOOK_APP_ID or FACEBOOK_APP_SECRET in .env.local');
    process.exit(1);
  }

  console.log('🔍 Checking App-Level Webhook Subscriptions\n');
  console.log(`📱 App ID: ${APP_ID}\n`);

  // Get app access token
  const appAccessToken = `${APP_ID}|${APP_SECRET}`;

  try {
    // Check app subscriptions
    const response = await fetch(
      `https://graph.facebook.com/v23.0/${APP_ID}/subscriptions?access_token=${appAccessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to check app subscriptions:', error);
      process.exit(1);
    }

    const data = await response.json();
    
    console.log('📊 App-Level Webhook Subscriptions:\n');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n' + '='.repeat(60));

    if (!data.data || data.data.length === 0) {
      console.log('\n❌ NO APP-LEVEL SUBSCRIPTIONS FOUND!');
      console.log('\n🚨 CRITICAL: This is why webhooks are not working!\n');
      console.log('📝 TO FIX:');
      console.log('   1. Go to https://developers.facebook.com/apps/');
      console.log(`   2. Select your app (ID: ${APP_ID})`);
      console.log('   3. Go to Products → Webhooks');
      console.log('   4. Find "Page" section');
      console.log('   5. Click "Edit Subscription"');
      console.log('   6. Subscribe to:');
      console.log('      - messages');
      console.log('      - messaging_postbacks');
      console.log('      - message_deliveries');
      console.log('      - message_reads');
      console.log('   7. Make sure Callback URL and Verify Token are set');
      console.log('   8. Make sure status is ACTIVE (green)\n');
      return;
    }

    // Check for Page subscriptions
    const pageSubscription = data.data.find(sub => sub.object === 'page');
    
    if (!pageSubscription) {
      console.log('\n❌ NO PAGE WEBHOOK SUBSCRIPTION FOUND!');
      console.log('\n🚨 CRITICAL: You need to subscribe to "Page" webhooks!\n');
      console.log('📝 See instructions above.');
      return;
    }

    console.log('\n✅ Page webhook subscription found:');
    console.log(`   Object: ${pageSubscription.object}`);
    console.log(`   Callback URL: ${pageSubscription.callback_url}`);
    console.log(`   Active: ${pageSubscription.active ? '✅ YES' : '❌ NO'}`);
    console.log(`   Fields: ${pageSubscription.fields.map(f => f.name).join(', ')}`);

    if (!pageSubscription.active) {
      console.log('\n❌ WEBHOOK IS NOT ACTIVE!');
      console.log('   Go to Meta App Dashboard and activate it.');
    }

    const requiredFields = ['messages', 'messaging_postbacks', 'message_deliveries', 'message_reads'];
    const subscribedFields = pageSubscription.fields.map(f => f.name);
    const missingFields = requiredFields.filter(f => !subscribedFields.includes(f));

    if (missingFields.length > 0) {
      console.log('\n⚠️  MISSING REQUIRED FIELDS:');
      missingFields.forEach(field => console.log(`   ❌ ${field}`));
      console.log('\n   Add these fields in Meta App Dashboard → Webhooks → Page');
    } else {
      console.log('\n✅ All required fields are subscribed!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📋 NEXT STEPS:');
    console.log('   1. Make sure app-level subscription is ACTIVE and has required fields');
    console.log('   2. Run: node resubscribe-all-pages.js');
    console.log('   3. Run: node check-all-webhook-subscriptions.js');
    console.log('   4. Test by sending messages to your Facebook pages\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAppWebhooks();

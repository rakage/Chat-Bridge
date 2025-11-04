/**
 * Check and Fix Webhook Subscriptions for All Pages
 * 
 * This script checks which pages are subscribed to webhooks
 * and can automatically subscribe any pages that are missing subscriptions
 * 
 * Run with: node check-all-webhook-subscriptions.js
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const db = new PrismaClient();

// Decrypt function
async function decrypt(encryptedText) {
  const sodiumModule = await import('libsodium-wrappers');
  const sodium = sodiumModule.default || sodiumModule;
  await sodium.ready;
  
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  if (!ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not found in environment variables');
  }

  if (!encryptedText) {
    throw new Error('Cannot decrypt null or undefined ciphertext');
  }

  const key = sodium.from_base64(ENCRYPTION_KEY, sodium.base64_variants.ORIGINAL);
  const combined = sodium.from_base64(encryptedText, sodium.base64_variants.ORIGINAL);
  
  const nonceLength = sodium.crypto_secretbox_NONCEBYTES;
  const nonce = combined.slice(0, nonceLength);
  const cipher = combined.slice(nonceLength);

  const plaintext = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
  
  if (!plaintext) {
    throw new Error('Decryption failed');
  }

  return sodium.to_string(plaintext);
}

async function checkAndFixWebhookSubscriptions() {
  try {
    console.log('📋 Checking Webhook Subscriptions for All Facebook Pages...\n');

    const pages = await db.pageConnection.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        pageAccessTokenEnc: true,
        subscribed: true,
        companyId: true,
      },
    });

    if (pages.length === 0) {
      console.log('❌ No Facebook pages connected');
      return;
    }

    console.log(`Found ${pages.length} connected page(s)\n`);

    const results = [];

    for (const page of pages) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 Page: ${page.pageName}`);
      console.log(`   Facebook Page ID: ${page.pageId}`);
      console.log(`   Database subscribed: ${page.subscribed ? '✅ Yes' : '❌ No'}`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        // Decrypt the access token
        const accessToken = await decrypt(page.pageAccessTokenEnc);

        // Check current webhook subscription status from Facebook
        console.log(`   🔍 Checking Facebook webhook subscription...`);
        const checkResponse = await fetch(
          `https://graph.facebook.com/v23.0/${page.pageId}/subscribed_apps?access_token=${accessToken}`
        );

        if (!checkResponse.ok) {
          const error = await checkResponse.text();
          console.log(`   ❌ Error checking subscription: ${error}\n`);
          results.push({
            pageName: page.pageName,
            pageId: page.pageId,
            status: 'error',
            error: error,
          });
          continue;
        }

        const checkData = await checkResponse.json();
        console.log(`   📊 Current subscriptions:`, JSON.stringify(checkData, null, 2));

        // Check if this page is subscribed
        const isSubscribed = checkData.data && checkData.data.length > 0;
        const subscribedFields = isSubscribed ? checkData.data[0].subscribed_fields || [] : [];

        if (isSubscribed) {
          console.log(`   ✅ Page IS subscribed to webhook`);
          console.log(`   📋 Subscribed fields: ${subscribedFields.join(', ')}`);
          
          // Check if messages field is included
          if (!subscribedFields.includes('messages')) {
            console.log(`   ⚠️  WARNING: 'messages' field is NOT subscribed!`);
          }

          results.push({
            pageName: page.pageName,
            pageId: page.pageId,
            status: 'subscribed',
            fields: subscribedFields,
          });
        } else {
          console.log(`   ❌ Page is NOT subscribed to webhook`);
          console.log(`   🔧 Attempting to subscribe...`);

          // Subscribe the page
          const subscribeUrl = new URL(`https://graph.facebook.com/v23.0/${page.pageId}/subscribed_apps`);
          subscribeUrl.searchParams.set('access_token', accessToken);
          subscribeUrl.searchParams.set('subscribed_fields', 'messages,messaging_postbacks,message_deliveries,message_reads');

          const subscribeResponse = await fetch(subscribeUrl.toString(), {
            method: 'POST',
          });

          if (subscribeResponse.ok) {
            const subscribeData = await subscribeResponse.json();
            console.log(`   ✅ Successfully subscribed! Response:`, subscribeData);

            // Update database
            await db.pageConnection.update({
              where: { id: page.id },
              data: { subscribed: true },
            });
            console.log(`   ✅ Database updated`);

            results.push({
              pageName: page.pageName,
              pageId: page.pageId,
              status: 'newly_subscribed',
              fields: ['messages', 'messaging_postbacks', 'message_deliveries', 'message_reads'],
            });
          } else {
            const subscribeError = await subscribeResponse.text();
            console.log(`   ❌ Failed to subscribe: ${subscribeError}`);

            results.push({
              pageName: page.pageName,
              pageId: page.pageId,
              status: 'subscription_failed',
              error: subscribeError,
            });
          }
        }

      } catch (error) {
        console.log(`   ❌ Error processing page: ${error.message}\n`);
        results.push({
          pageName: page.pageName,
          pageId: page.pageId,
          status: 'error',
          error: error.message,
        });
      }
    }

    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`📊 SUMMARY\n`);
    console.log(`${'='.repeat(60)}\n`);

    const subscribed = results.filter(r => r.status === 'subscribed' || r.status === 'newly_subscribed');
    const failed = results.filter(r => r.status === 'error' || r.status === 'subscription_failed');

    console.log(`✅ Subscribed pages: ${subscribed.length}/${results.length}`);
    subscribed.forEach(r => {
      console.log(`   - ${r.pageName} (${r.pageId})`);
      if (r.fields) {
        console.log(`     Fields: ${r.fields.join(', ')}`);
      }
    });

    if (failed.length > 0) {
      console.log(`\n❌ Failed pages: ${failed.length}/${results.length}`);
      failed.forEach(r => {
        console.log(`   - ${r.pageName} (${r.pageId}): ${r.error}`);
      });
    }

    console.log(`\n${'='.repeat(60)}\n`);
    
    if (subscribed.length === results.length) {
      console.log(`🎉 All pages are properly subscribed to webhooks!`);
    } else {
      console.log(`⚠️  Some pages need attention. Check the errors above.`);
    }

    console.log(`\n💡 Important: Webhook endpoint configuration in Meta App Dashboard`);
    console.log(`   must be set to receive webhook events for ALL pages.`);
    console.log(`   Go to: https://developers.facebook.com/apps/`);
    console.log(`   Your App → Webhooks → Page → Edit Subscription\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkAndFixWebhookSubscriptions();

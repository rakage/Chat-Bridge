/**
 * Force Re-subscribe All Pages to Webhooks
 * 
 * This script will:
 * 1. Check current subscription status for each page
 * 2. Force re-subscribe all pages to ensure they receive webhooks
 * 3. Verify subscription was successful
 * 
 * Run with: node resubscribe-all-pages.js
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

async function resubscribeAllPages() {
  try {
    console.log('🔄 Force Re-subscribing All Facebook Pages to Webhooks\n');

    const pages = await db.pageConnection.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        pageAccessTokenEnc: true,
        subscribed: true,
      },
    });

    if (pages.length === 0) {
      console.log('❌ No Facebook pages connected');
      return;
    }

    console.log(`Found ${pages.length} connected page(s)\n`);

    for (const page of pages) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 ${page.pageName} (${page.pageId})`);
      console.log(`${'='.repeat(60)}`);

      try {
        const accessToken = await decrypt(page.pageAccessTokenEnc);

        // STEP 1: Check current subscription
        console.log(`   🔍 Checking current subscription...`);
        const checkResponse = await fetch(
          `https://graph.facebook.com/v23.0/${page.pageId}/subscribed_apps?access_token=${accessToken}`
        );

        if (checkResponse.ok) {
          const checkData = await checkResponse.json();
          const isSubscribed = checkData.data && checkData.data.length > 0;
          
          if (isSubscribed) {
            const fields = checkData.data[0].subscribed_fields || [];
            console.log(`   ✅ Currently subscribed: ${fields.join(', ')}`);
          } else {
            console.log(`   ❌ NOT subscribed`);
          }
        }

        // STEP 2: Force re-subscribe (this will refresh the subscription)
        console.log(`   🔧 Force re-subscribing...`);
        
        const subscribeUrl = new URL(`https://graph.facebook.com/v23.0/${page.pageId}/subscribed_apps`);
        subscribeUrl.searchParams.set('access_token', accessToken);
        subscribeUrl.searchParams.set('subscribed_fields', 'messages,messaging_postbacks,message_deliveries,message_reads');

        const subscribeResponse = await fetch(subscribeUrl.toString(), {
          method: 'POST',
        });

        if (!subscribeResponse.ok) {
          const error = await subscribeResponse.text();
          console.log(`   ❌ Re-subscription failed: ${error}`);
          continue;
        }

        const subscribeData = await subscribeResponse.json();
        console.log(`   ✅ Re-subscription successful:`, subscribeData);

        // STEP 3: Verify subscription
        console.log(`   🔍 Verifying subscription...`);
        
        // Wait a bit for Facebook to process
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const verifyResponse = await fetch(
          `https://graph.facebook.com/v23.0/${page.pageId}/subscribed_apps?access_token=${accessToken}`
        );

        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const isNowSubscribed = verifyData.data && verifyData.data.length > 0;
          
          if (isNowSubscribed) {
            const fields = verifyData.data[0].subscribed_fields || [];
            console.log(`   ✅ VERIFIED: Subscribed to ${fields.join(', ')}`);
            
            // Update database
            await db.pageConnection.update({
              where: { id: page.id },
              data: { subscribed: true },
            });
            console.log(`   ✅ Database updated`);
          } else {
            console.log(`   ❌ VERIFICATION FAILED: Still not subscribed!`);
          }
        }

      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
      }
    }

    console.log(`\n\n${'='.repeat(60)}`);
    console.log(`✅ Re-subscription process completed`);
    console.log(`${'='.repeat(60)}\n`);

    console.log(`📋 Next Steps:`);
    console.log(`   1. Send a test message to EACH Facebook page`);
    console.log(`   2. Check if webhook is received in your app`);
    console.log(`   3. Check server logs for webhook events\n`);

    console.log(`⚠️  Important: Webhook Configuration`);
    console.log(`   Make sure in Meta App Dashboard → Webhooks:`);
    console.log(`   - Callback URL is correct`);
    console.log(`   - Verify Token is correct`);
    console.log(`   - Status is ACTIVE (green)`);
    console.log(`   - Subscribed to: messages, messaging_postbacks, etc.\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

resubscribeAllPages();

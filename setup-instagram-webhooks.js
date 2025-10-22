#!/usr/bin/env node

/**
 * Script to set up Instagram webhook subscriptions for multiple accounts
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Import existing encryption utility
let decrypt;
try {
  const encryptionModule = require('./src/lib/encryption.ts');
  decrypt = encryptionModule.decrypt;
} catch (error) {
  console.log('Using fallback decryption...');
  // Fallback decryption function
  decrypt = function(encryptedData) {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!ENCRYPTION_KEY) {
      throw new Error('ENCRYPTION_KEY not found in environment variables');
    }

    try {
      const textParts = encryptedData.split(':');
      const iv = Buffer.from(textParts.shift(), 'hex');
      const encryptedText = Buffer.from(textParts.join(':'), 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      return decrypted.toString();
    } catch (error) {
      console.error('Decryption failed:', error);
      throw error;
    }
  };
}

async function getFacebookPagesForInstagram() {
  try {
    console.log('🔍 Finding Facebook Pages connected to Instagram accounts...\n');

    const connections = await prisma.instagramConnection.findMany({
      where: { isActive: true },
      include: { company: true }
    });

    for (const connection of connections) {
      console.log(`📱 Checking @${connection.username} (${connection.instagramUserId})`);
      
      try {
        const accessToken = decrypt(connection.accessTokenEnc);
        
        // Get Facebook pages connected to this Instagram account
        const response = await fetch(
          `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account{id,username},id,name,access_token&access_token=${accessToken}`
        );

        if (!response.ok) {
          console.log(`   ❌ Failed to get Facebook pages: ${response.status}`);
          continue;
        }

        const data = await response.json();
        console.log(`   📄 Found ${data.data?.length || 0} Facebook pages`);

        if (data.data && data.data.length > 0) {
          for (const page of data.data) {
            if (page.instagram_business_account) {
              const igAccount = page.instagram_business_account;
              
              if (igAccount.id === connection.instagramUserId || 
                  igAccount.username === connection.username) {
                
                console.log(`   ✅ Found connected Facebook Page:`);
                console.log(`      Page Name: ${page.name}`);
                console.log(`      Page ID: ${page.id}`);
                console.log(`      Instagram: @${igAccount.username} (${igAccount.id})`);
                
                // Check webhook subscription for this page
                await checkWebhookSubscription(page.id, page.access_token, page.name);
              }
            }
          }
        } else {
          console.log(`   ⚠️ No Facebook pages found for @${connection.username}`);
          console.log(`      This might be why webhooks aren't working for this account`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing @${connection.username}: ${error.message}`);
      }
      
      console.log('');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function checkWebhookSubscription(pageId, pageAccessToken, pageName) {
  try {
    console.log(`      🔗 Checking webhook subscription for "${pageName}"...`);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps?access_token=${pageAccessToken}`
    );

    if (!response.ok) {
      console.log(`      ❌ Failed to check webhook subscription: ${response.status}`);
      return;
    }

    const data = await response.json();
    const subscribedApps = data.data || [];
    
    console.log(`      📋 Subscribed apps: ${subscribedApps.length}`);
    
    const yourAppId = process.env.FACEBOOK_APP_ID;
    const isSubscribed = subscribedApps.some(app => app.id === yourAppId);
    
    if (isSubscribed) {
      console.log(`      ✅ Page "${pageName}" is subscribed to your webhook`);
    } else {
      console.log(`      ❌ Page "${pageName}" is NOT subscribed to your webhook`);
      console.log(`      💡 You need to subscribe this page to receive Instagram messages`);
      
      // Offer to subscribe automatically
      if (process.argv.includes('--subscribe')) {
        await subscribePageToWebhook(pageId, pageAccessToken, pageName);
      } else {
        console.log(`      📝 To subscribe automatically, run: node setup-instagram-webhooks.js --subscribe`);
      }
    }
    
  } catch (error) {
    console.log(`      ❌ Error checking webhook: ${error.message}`);
  }
}

async function subscribePageToWebhook(pageId, pageAccessToken, pageName) {
  try {
    console.log(`      🔄 Subscribing "${pageName}" to webhook...`);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribed_fields: 'messages,messaging_postbacks,message_deliveries,message_reads',
          access_token: pageAccessToken
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.log(`      ❌ Subscription failed: ${error}`);
      return;
    }

    const result = await response.json();
    if (result.success) {
      console.log(`      ✅ Successfully subscribed "${pageName}" to webhook!`);
    } else {
      console.log(`      ⚠️ Subscription response: ${JSON.stringify(result)}`);
    }
    
  } catch (error) {
    console.log(`      ❌ Error subscribing to webhook: ${error.message}`);
  }
}

async function testInstagramWebhook() {
  console.log('🧪 Testing Instagram webhook setup...\n');
  
  const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhook/instagram`;
  console.log(`📡 Webhook URL: ${webhookUrl}`);
  console.log(`🔑 Verify Token: instagram_webhook_token_123`);
  console.log('');
  
  console.log('📝 Manual Setup Steps:');
  console.log('1. Go to Facebook App Dashboard → Webhooks');
  console.log(`2. Add webhook URL: ${webhookUrl}`);
  console.log('3. Set verify token: instagram_webhook_token_123');
  console.log('4. Subscribe to: messages, messaging_postbacks');
  console.log('5. Subscribe each Facebook Page connected to Instagram accounts');
  console.log('');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    testInstagramWebhook();
  } else {
    getFacebookPagesForInstagram();
  }
}

module.exports = { getFacebookPagesForInstagram, checkWebhookSubscription };
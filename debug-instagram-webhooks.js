#!/usr/bin/env node

/**
 * Debug script to check Instagram webhook setup for multiple accounts
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function debugInstagramWebhooks() {
  try {
    console.log('🔍 Instagram Webhook Debug Report\n');

    // Get all Instagram connections
    const connections = await prisma.instagramConnection.findMany({
      where: { isActive: true },
      include: { company: true }
    });

    console.log(`📱 Found ${connections.length} active Instagram connections:\n`);

    for (const connection of connections) {
      console.log(`🔹 Account: @${connection.username}`);
      console.log(`   Instagram User ID: ${connection.instagramUserId}`);
      console.log(`   Account Type: ${connection.accountType}`);
      console.log(`   Company: ${connection.company.name}`);
      console.log(`   Messaging Enabled: ${connection.messagingEnabled}`);
      
      // Check conversations for this account
      const conversations = await prisma.conversation.findMany({
        where: { 
          instagramConnectionId: connection.id,
          platform: 'INSTAGRAM'
        }
      });
      
      console.log(`   💬 Conversations: ${conversations.length}`);
      
      if (conversations.length > 0) {
        conversations.forEach(conv => {
          console.log(`      - PSID: ${conv.psid} | Status: ${conv.status} | Messages: ${conv.lastMessageAt}`);
        });
      }
      
      console.log('');
    }

    // Check webhook configuration
    console.log('🔗 Webhook Configuration:');
    console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
    console.log(`   Expected webhook URL: ${process.env.NEXTAUTH_URL}/api/webhook/instagram`);
    console.log(`   Instagram App ID: ${process.env.INSTAGRAM_APP_ID || 'NOT SET'}`);
    console.log(`   Instagram App Secret: ${process.env.INSTAGRAM_APP_SECRET ? '***SET***' : 'NOT SET'}`);
    console.log('');

    // Test webhook verification token
    console.log('🔐 Webhook Verification:');
    console.log(`   Expected verify token: "instagram_webhook_token_123"`);
    console.log('');

    // Recommendations
    console.log('💡 Troubleshooting Steps:');
    console.log('');
    console.log('1. 📱 Instagram Business Account Setup:');
    console.log('   Each Instagram account needs to be connected to a Facebook Page');
    console.log('   The Facebook Page needs webhook subscription');
    console.log('');
    console.log('2. 🔗 Webhook Subscription:');
    console.log('   Instagram webhooks work through Facebook\'s platform');
    console.log('   You need to subscribe each Facebook Page to your webhook');
    console.log('');
    console.log('3. 🔍 Check Facebook App Dashboard:');
    console.log('   - Go to your Facebook App');
    console.log('   - Check Webhooks section');
    console.log('   - Verify callback URL and verify token');
    console.log('   - Subscribe to: messages, messaging_postbacks');
    console.log('');
    console.log('4. ✅ Test Each Account:');
    console.log('   Send a DM to each Instagram account');
    console.log('   Check webhook logs for both accounts');
    console.log('');

    // Create test webhook payload for each account
    console.log('🧪 Test Webhook Payloads:');
    console.log('');
    
    connections.forEach((connection, index) => {
      const testPayload = {
        object: "instagram",
        entry: [
          {
            time: Date.now(),
            id: connection.instagramUserId,
            messaging: [
              {
                sender: { id: "TEST_CUSTOMER_ID" },
                recipient: { id: connection.instagramUserId },
                timestamp: Date.now(),
                message: {
                  mid: `test_message_${index}`,
                  text: `Test message for @${connection.username}`
                }
              }
            ]
          }
        ]
      };

      console.log(`📤 Test payload for @${connection.username}:`);
      console.log(JSON.stringify(testPayload, null, 2));
      console.log('');
    });

  } catch (error) {
    console.error('❌ Debug script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Check for specific Instagram User ID
async function checkSpecificAccount(instagramUserId) {
  try {
    console.log(`🔍 Checking specific Instagram account: ${instagramUserId}\n`);

    const connection = await prisma.instagramConnection.findFirst({
      where: { 
        instagramUserId,
        isActive: true 
      },
      include: { company: true }
    });

    if (!connection) {
      console.log(`❌ No active connection found for Instagram User ID: ${instagramUserId}`);
      return;
    }

    console.log(`✅ Found connection: @${connection.username}`);
    console.log(`   Company: ${connection.company.name}`);
    console.log(`   Account Type: ${connection.accountType}`);
    console.log(`   Created: ${connection.createdAt}`);
    console.log('');

    // Check conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        instagramConnectionId: connection.id,
        platform: 'INSTAGRAM'
      },
      include: {
        _count: {
          select: { messages: true }
        }
      }
    });

    console.log(`💬 Conversations: ${conversations.length}`);
    conversations.forEach(conv => {
      console.log(`   - ID: ${conv.id}`);
      console.log(`     PSID: ${conv.psid}`);
      console.log(`     Messages: ${conv._count.messages}`);
      console.log(`     Last Activity: ${conv.lastMessageAt}`);
    });

  } catch (error) {
    console.error('❌ Error checking specific account:', error);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'check' && args[1]) {
    checkSpecificAccount(args[1]);
  } else {
    debugInstagramWebhooks();
  }
}

module.exports = { debugInstagramWebhooks, checkSpecificAccount };
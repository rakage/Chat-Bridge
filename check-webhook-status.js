#!/usr/bin/env node

/**
 * Simple script to check Instagram webhook status and configuration
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkWebhookStatus() {
  try {
    console.log('🔍 Instagram Webhook Status Check\n');

    // Get all Instagram connections
    const connections = await prisma.instagramConnection.findMany({
      where: { isActive: true },
      include: { company: true }
    });

    console.log(`📱 Active Instagram connections: ${connections.length}\n`);

    for (const connection of connections) {
      console.log(`🔹 Account: @${connection.username}`);
      console.log(`   Instagram User ID: ${connection.instagramUserId}`);
      console.log(`   Account Type: ${connection.accountType}`);
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
        console.log(`   ✅ Webhooks working (has conversations)`);
      } else {
        console.log(`   ❌ No webhooks received (no conversations)`);
      }
      
      console.log('');
    }

    // Check environment configuration
    console.log('🔧 Configuration:');
    console.log(`   NEXTAUTH_URL: ${process.env.NEXTAUTH_URL}`);
    console.log(`   Webhook URL: ${process.env.NEXTAUTH_URL}/api/webhook/instagram`);
    console.log(`   Facebook App ID: ${process.env.FACEBOOK_APP_ID}`);
    console.log(`   Instagram App ID: ${process.env.INSTAGRAM_APP_ID}`);
    console.log('');

    // Recommendations
    console.log('📋 Next Steps:');
    console.log('');
    console.log('For the account with NO webhooks (@dian.aulia19):');
    console.log('1. 🔗 Check if it\'s connected to a Facebook Page');
    console.log('2. 🔔 Verify the Facebook Page is subscribed to your webhook');
    console.log('3. 📱 Test by sending a DM to @dian.aulia19');
    console.log('4. 📊 Check webhook logs for incoming requests');
    console.log('');
    
    console.log('Manual webhook setup:');
    console.log('1. Go to Facebook App Dashboard → Webhooks');
    console.log(`2. Verify webhook URL: ${process.env.NEXTAUTH_URL}/api/webhook/instagram`);
    console.log('3. Verify token: instagram_webhook_token_123');
    console.log('4. Subscribe to: messages, messaging_postbacks');
    console.log('5. Subscribe ALL Facebook Pages connected to Instagram accounts');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function simulateWebhookForSecondAccount() {
  console.log('🧪 Simulating webhook for @dian.aulia19...\n');
  
  const testPayload = {
    object: "instagram",
    entry: [
      {
        time: Date.now(),
        id: "24607177772287749", // dian.aulia19's Instagram ID
        messaging: [
          {
            sender: { id: "TEST_SENDER_ID_123" },
            recipient: { id: "24607177772287749" },
            timestamp: Date.now(),
            message: {
              mid: "test_message_dian",
              text: "Test message for dian.aulia19"
            }
          }
        ]
      }
    ]
  };

  console.log('📤 Test payload:');
  console.log(JSON.stringify(testPayload, null, 2));
  console.log('');
  
  console.log('🔧 To test manually:');
  console.log(`POST ${process.env.NEXTAUTH_URL}/api/webhook/instagram`);
  console.log('Content-Type: application/json');
  console.log('Body: (payload above)');
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--simulate')) {
    simulateWebhookForSecondAccount();
  } else {
    checkWebhookStatus();
  }
}

module.exports = { checkWebhookStatus };
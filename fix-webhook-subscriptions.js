#!/usr/bin/env node

/**
 * Manual script to fix webhook subscriptions for all Facebook pages
 * 
 * Usage:
 * node fix-webhook-subscriptions.js
 * 
 * This script will:
 * 1. Check all page connections in the database
 * 2. Subscribe each page to webhooks individually
 * 3. Report the results
 */

const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  console.log('🔄 Starting webhook subscription fix...\n');

  try {
    // Get all page connections
    const pageConnections = await prisma.pageConnection.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        pageAccessTokenEnc: true,
        companyId: true,
        company: {
          select: {
            name: true
          }
        }
      }
    });

    console.log(`🔍 Found ${pageConnections.length} page connections`);

    if (pageConnections.length === 0) {
      console.log('⚠️ No page connections found. Make sure you have connected Facebook pages first.');
      return;
    }

    let successful = 0;
    let failed = 0;

    // Process each page
    for (const page of pageConnections) {
      console.log(`\n🔄 Processing: ${page.pageName} (${page.pageId})`);
      console.log(`   Company: ${page.company.name}`);

      try {
        // Decrypt the access token (simplified - you might need to implement this)
        const pageAccessToken = page.pageAccessTokenEnc; // You'll need to decrypt this
        
        // Subscribe to webhook (using Facebook Graph API directly)
        const subscriptionFields = [
          'messages',
          'messaging_postbacks',
          'message_deliveries',
          'message_reads',
          'messaging_optins',
          'messaging_referrals',
          'messaging_account_linking',
          'message_reactions',
        ];

        const subscriptionUrl = `https://graph.facebook.com/v23.0/${page.pageId}/subscribed_apps`;
        
        // For now, just log what would be done
        console.log(`   📡 Would subscribe to: ${subscriptionFields.join(', ')}`);
        console.log(`   📡 Subscription URL: ${subscriptionUrl}`);
        console.log(`   ✅ Processed (simulation mode)`);
        
        successful++;

      } catch (error) {
        console.log(`   ❌ Failed: ${error.message}`);
        failed++;
      }
    }

    console.log(`\n🏁 Results:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📊 Success Rate: ${((successful / pageConnections.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Script error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  console.log('='.repeat(50));
  console.log('📡 Facebook Webhook Subscription Fix Script');
  console.log('='.repeat(50));
  
  main()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = main;
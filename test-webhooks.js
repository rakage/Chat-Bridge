#!/usr/bin/env node

/**
 * Simple test script to check and fix webhook subscriptions
 * 
 * Usage: node test-webhooks.js
 */

const { PrismaClient } = require('@prisma/client');
const fetch = require('node-fetch');

async function main() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking current page connections...\n');

    // Get all page connections
    const pages = await prisma.pageConnection.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        subscribed: true,
        company: {
          select: {
            name: true
          }
        }
      }
    });

    if (pages.length === 0) {
      console.log('❌ No page connections found');
      return;
    }

    console.log(`Found ${pages.length} page connections:`);
    pages.forEach((page, index) => {
      console.log(`${index + 1}. ${page.pageName} (${page.pageId})`);
      console.log(`   Company: ${page.company.name}`);
      console.log(`   Subscribed: ${page.subscribed ? '✅ Yes' : '❌ No'}`);
      console.log('');
    });

    // Count subscribed vs unsubscribed
    const subscribed = pages.filter(p => p.subscribed).length;
    const unsubscribed = pages.filter(p => !p.subscribed).length;

    console.log(`📊 Summary:`);
    console.log(`   ✅ Subscribed: ${subscribed}`);
    console.log(`   ❌ Unsubscribed: ${unsubscribed}`);
    console.log(`   📊 Total: ${pages.length}`);

    if (unsubscribed > 0) {
      console.log('\n💡 To fix unsubscribed pages, you can:');
      console.log('   1. Use the API: POST http://localhost:3000/api/debug/fix-webhooks');
      console.log('   2. Reconnect the Facebook accounts');
      console.log('   3. Check the webhook URL in Facebook App Dashboard');
    } else {
      console.log('\n🎉 All pages are marked as subscribed!');
      console.log('💡 Test by sending messages to your Facebook pages');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
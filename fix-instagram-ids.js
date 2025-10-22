#!/usr/bin/env node

/**
 * Script to fix Instagram connection IDs to use correct webhook IDs
 */

require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Mapping of known incorrect IDs to correct webhook IDs
const ID_MAPPINGS = {
  // Based on your webhook logs, map the stored IDs to webhook recipient IDs
  '17841422459762662': '17841403476602946', // scarytoilets
  '24607177772287749': null, // dian.aulia19 - need to find correct webhook ID
};

async function fixInstagramConnectionIds() {
  try {
    console.log('🔧 Fixing Instagram Connection IDs for webhook compatibility\n');

    const connections = await prisma.instagramConnection.findMany({
      where: { isActive: true },
      include: { company: true }
    });

    console.log(`📱 Found ${connections.length} Instagram connections:\n`);

    for (const connection of connections) {
      console.log(`🔹 Account: @${connection.username}`);
      console.log(`   Current ID: ${connection.instagramUserId}`);
      console.log(`   Account Type: ${connection.accountType}`);
      
      // Check if we have a known mapping
      const correctId = ID_MAPPINGS[connection.instagramUserId];
      
      if (correctId) {
        console.log(`   🎯 Correct webhook ID: ${correctId}`);
        
        // Update the connection with the correct webhook ID
        await prisma.instagramConnection.update({
          where: { id: connection.id },
          data: { instagramUserId: correctId }
        });
        
        console.log(`   ✅ Updated connection to use correct webhook ID`);
      } else if (correctId === null) {
        console.log(`   ⚠️ Needs manual mapping - webhook ID unknown`);
        console.log(`   📝 To find the correct ID:`);
        console.log(`      1. Send a message to @${connection.username} on Instagram`);
        console.log(`      2. Check webhook logs for the recipient ID`);
        console.log(`      3. Update the mapping in this script`);
      } else {
        console.log(`   ✅ No mapping needed (already correct or unknown account)`);
      }
      
      console.log('');
    }

    // Show current webhook test results
    console.log('🧪 Testing webhook compatibility:');
    console.log('');
    console.log('Known webhook recipient IDs from your logs:');
    console.log('- 17841403476602946 (should match @scarytoilets after fix)');
    console.log('');
    console.log('Next steps:');
    console.log('1. ✅ @scarytoilets should now work with webhooks');
    console.log('2. 🔍 Send a message to @dian.aulia19 to find its webhook ID');
    console.log('3. 📝 Update the mapping and re-run this script');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

async function showCurrentMappings() {
  console.log('📊 Current Instagram Connection Status:\n');
  
  const connections = await prisma.instagramConnection.findMany({
    where: { isActive: true }
  });

  connections.forEach(conn => {
    console.log(`🔹 @${conn.username}: ${conn.instagramUserId}`);
  });
  
  console.log('\n🎯 Known webhook recipient IDs:');
  console.log('- 17841403476602946 (from webhook logs)');
  console.log('');
  console.log('📝 To update mappings, edit ID_MAPPINGS in this script');
}

// Manual ID mapping function
async function updateSpecificId(username, newId) {
  try {
    const connection = await prisma.instagramConnection.findFirst({
      where: { 
        username: username,
        isActive: true 
      }
    });

    if (!connection) {
      console.log(`❌ No connection found for @${username}`);
      return;
    }

    const oldId = connection.instagramUserId;
    
    await prisma.instagramConnection.update({
      where: { id: connection.id },
      data: { instagramUserId: newId }
    });

    console.log(`✅ Updated @${username}:`);
    console.log(`   Old ID: ${oldId}`);
    console.log(`   New ID: ${newId}`);

  } catch (error) {
    console.error(`❌ Error updating @${username}:`, error);
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'show') {
    showCurrentMappings();
  } else if (args[0] === 'update' && args[1] && args[2]) {
    updateSpecificId(args[1], args[2]);
  } else if (args[0] === 'help') {
    console.log('Usage:');
    console.log('  node fix-instagram-ids.js        - Fix all known mappings');
    console.log('  node fix-instagram-ids.js show   - Show current status');
    console.log('  node fix-instagram-ids.js update <username> <new_id> - Update specific account');
    console.log('');
    console.log('Examples:');
    console.log('  node fix-instagram-ids.js update scarytoilets 17841403476602946');
  } else {
    fixInstagramConnectionIds();
  }
}

module.exports = { fixInstagramConnectionIds, updateSpecificId };
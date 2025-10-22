#!/usr/bin/env node

/**
 * Manual script to update Instagram connection IDs to correct webhook IDs
 */

require('dotenv').config({ path: '.env.local' });

const { Client } = require('pg');

async function updateInstagramIds() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.error('💡 Make sure your .env.local file contains DATABASE_URL');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // First, let's see what we currently have
    console.log('\n📊 Current Instagram connections:');
    const currentConnections = await client.query(`
      SELECT id, "instagramUserId", username, "accountType", "isActive" 
      FROM instagram_connections 
      WHERE "isActive" = true
      ORDER BY "createdAt" DESC
    `);

    currentConnections.rows.forEach(row => {
      console.log(`🔹 @${row.username}: ${row.instagramUserId} (${row.accountType})`);
    });

    if (currentConnections.rows.length === 0) {
      console.log('❌ No Instagram connections found in database');
      return;
    }

    // Update known incorrect IDs
    const updates = [
      {
        username: 'scarytoilets',
        oldId: '17841422459762662',
        newId: '17841403476602946', // From your webhook logs
        reason: 'Webhook recipient ID mismatch'
      }
      // We'll add dian.aulia19 once we know the correct webhook ID
    ];

    console.log('\n🔧 Applying ID corrections:');

    for (const update of updates) {
      console.log(`\n📱 Updating @${update.username}:`);
      console.log(`   Old ID: ${update.oldId}`);
      console.log(`   New ID: ${update.newId}`);
      console.log(`   Reason: ${update.reason}`);

      const result = await client.query(`
        UPDATE instagram_connections 
        SET "instagramUserId" = $1, "updatedAt" = NOW()
        WHERE username = $2 AND "instagramUserId" = $3 AND "isActive" = true
      `, [update.newId, update.username, update.oldId]);

      if (result.rowCount > 0) {
        console.log(`   ✅ Updated ${result.rowCount} connection(s)`);
      } else {
        console.log(`   ⚠️ No matching connection found to update`);
      }
    }

    // Show final status
    console.log('\n📊 Updated Instagram connections:');
    const updatedConnections = await client.query(`
      SELECT id, "instagramUserId", username, "accountType", "updatedAt" 
      FROM instagram_connections 
      WHERE "isActive" = true
      ORDER BY "updatedAt" DESC
    `);

    updatedConnections.rows.forEach(row => {
      console.log(`🔹 @${row.username}: ${row.instagramUserId} (${row.accountType})`);
    });

    console.log('\n🎯 Next steps:');
    console.log('1. ✅ @scarytoilets should now work with webhooks');
    console.log('2. 📱 Send a message to @dian.aulia19 to find its webhook ID');
    console.log('3. 🔄 Update this script with the correct webhook ID for dian.aulia19');
    console.log('4. 🧪 Test webhooks by sending messages to both accounts');

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await client.end();
    console.log('\n🔗 Database connection closed');
  }
}

// Function to add a new ID mapping
async function addIdMapping(username, newId) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable not set');
    return;
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    const result = await client.query(`
      UPDATE instagram_connections 
      SET "instagramUserId" = $1, "updatedAt" = NOW()
      WHERE username = $2 AND "isActive" = true
    `, [newId, username]);

    if (result.rowCount > 0) {
      console.log(`✅ Updated @${username} to use Instagram ID: ${newId}`);
    } else {
      console.log(`❌ No active connection found for @${username}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'add' && args[1] && args[2]) {
    addIdMapping(args[1], args[2]);
  } else if (args[0] === 'help') {
    console.log('Usage:');
    console.log('  node manual-fix-instagram-ids.js           - Apply all known corrections');
    console.log('  node manual-fix-instagram-ids.js add <username> <new_id> - Add specific correction');
    console.log('');
    console.log('Examples:');
    console.log('  node manual-fix-instagram-ids.js add dian.aulia19 17841455280630860');
  } else {
    updateInstagramIds();
  }
}

module.exports = { updateInstagramIds, addIdMapping };
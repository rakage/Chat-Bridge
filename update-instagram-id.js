#!/usr/bin/env node

/**
 * Simple script to update Instagram connection ID
 * Usage: node update-instagram-id.js <username> <newId>
 */

require('dotenv').config({ path: '.env.local' });
const fetch = require('node-fetch').default || require('node-fetch');

const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('Usage: node update-instagram-id.js <username> <newId>');
  console.log('');
  console.log('Examples:');
  console.log('  node update-instagram-id.js scarytoilets 17841403476602946');
  console.log('  node update-instagram-id.js dian.aulia19 17841455280630860');
  process.exit(1);
}

const [username, newId] = args;

console.log(`🔧 Updating @${username} Instagram ID to: ${newId}`);

// Update via API endpoint
const updateViaAPI = async () => {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    console.log('📡 Making API request to update Instagram ID...');
    
    const response = await fetch(`${baseUrl}/api/instagram/update-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'next-auth.session-token=your-session-token' // You'll need to get this from browser
      },
      body: JSON.stringify({
        username: username,
        newInstagramUserId: newId,
        reason: 'Fix webhook recipient ID mismatch'
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Successfully updated Instagram ID:');
      console.log(`   Username: @${result.update.username}`);
      console.log(`   Old ID: ${result.update.oldInstagramUserId}`);
      console.log(`   New ID: ${result.update.newInstagramUserId}`);
      console.log(`   Reason: ${result.update.reason}`);
    } else {
      const error = await response.json();
      console.error('❌ API request failed:', error.error);
      
      console.log('');
      console.log('💡 Alternative: Update manually via database:');
      console.log('');
      console.log('SQL command:');
      console.log(`UPDATE instagram_connections SET "instagramUserId" = '${newId}', "updatedAt" = NOW() WHERE username = '${username}' AND "isActive" = true;`);
      console.log('');
      console.log('Or use your app\'s interface once you\'re logged in.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    console.log('');
    console.log('💡 Manual update option:');
    console.log('1. Run: npx prisma studio');
    console.log('2. Open instagram_connections table');
    console.log(`3. Find @${username} row`);
    console.log(`4. Update instagramUserId to: ${newId}`);
    console.log(`5. Save changes`);
  }
};

updateViaAPI();
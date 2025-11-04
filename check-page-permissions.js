/**
 * Check Facebook Page Access Token Permissions
 * 
 * This script checks what permissions each connected Facebook page has.
 * Run with: node check-page-permissions.js
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const db = new PrismaClient();

// Decrypt function (copied from encryption.ts for Node.js compatibility)
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

  // Convert base64 encryption key to Uint8Array
  const key = sodium.from_base64(ENCRYPTION_KEY, sodium.base64_variants.ORIGINAL);
  
  // Decode the combined base64 string
  const combined = sodium.from_base64(encryptedText, sodium.base64_variants.ORIGINAL);
  
  // Split into nonce and ciphertext
  const nonceLength = sodium.crypto_secretbox_NONCEBYTES;
  const nonce = combined.slice(0, nonceLength);
  const cipher = combined.slice(nonceLength);

  // Decrypt
  const plaintext = sodium.crypto_secretbox_open_easy(cipher, nonce, key);
  
  if (!plaintext) {
    throw new Error('Decryption failed');
  }

  return sodium.to_string(plaintext);
}

async function checkPagePermissions() {
  try {
    console.log('📋 Checking Facebook Page Access Token Permissions...\n');

    const pages = await db.pageConnection.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        pageAccessTokenEnc: true,
        companyId: true,
      },
    });

    if (pages.length === 0) {
      console.log('❌ No Facebook pages connected');
      return;
    }

    console.log(`Found ${pages.length} connected page(s)\n`);

    for (const page of pages) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📄 Page: ${page.pageName}`);
      console.log(`   Facebook Page ID: ${page.pageId}`);
      console.log(`   Database ID: ${page.id}`);
      console.log(`${'='.repeat(60)}\n`);

      try {
        // Decrypt the access token
        const accessToken = await decrypt(page.pageAccessTokenEnc);

        // Check token info using Facebook Debug Token API
        const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
        const debugResponse = await fetch(
          `https://graph.facebook.com/v23.0/debug_token?input_token=${accessToken}&access_token=${appToken}`
        );

        if (!debugResponse.ok) {
          const error = await debugResponse.text();
          console.log(`   ❌ Error checking token: ${error}\n`);
          continue;
        }

        const debugData = await debugResponse.json();
        const tokenData = debugData.data;

        console.log(`   Token Status: ${tokenData.is_valid ? '✅ Valid' : '❌ Invalid'}`);
        console.log(`   Token Type: ${tokenData.type}`);
        console.log(`   Expires: ${tokenData.expires_at ? new Date(tokenData.expires_at * 1000).toLocaleString() : 'Never (long-lived)'}`);
        
        if (tokenData.scopes) {
          console.log(`\n   📋 Granted Permissions (${tokenData.scopes.length}):`);
          const requiredPermissions = ['pages_messaging', 'pages_manage_metadata', 'pages_show_list'];
          
          tokenData.scopes.forEach((scope) => {
            const isRequired = requiredPermissions.includes(scope);
            const icon = isRequired ? '✅' : '  ';
            console.log(`      ${icon} ${scope}`);
          });

          // Check for missing required permissions
          const missingPermissions = requiredPermissions.filter(
            (perm) => !tokenData.scopes.includes(perm)
          );

          if (missingPermissions.length > 0) {
            console.log(`\n   ⚠️  MISSING REQUIRED PERMISSIONS:`);
            missingPermissions.forEach((perm) => {
              console.log(`      ❌ ${perm}`);
            });
            console.log(`\n   🔧 Action Required: Reconnect this page to grant missing permissions`);
          } else {
            console.log(`\n   ✅ All required permissions are granted!`);
          }
        }

        // Try to fetch page info to verify the token works
        const pageInfoResponse = await fetch(
          `https://graph.facebook.com/v23.0/${page.pageId}?fields=id,name,category&access_token=${accessToken}`
        );

        if (pageInfoResponse.ok) {
          const pageInfo = await pageInfoResponse.json();
          console.log(`\n   📊 Page Info Test: ✅ Token can access page data`);
          console.log(`      Category: ${pageInfo.category || 'N/A'}`);
        } else {
          console.log(`\n   📊 Page Info Test: ❌ Token cannot access page data`);
        }

      } catch (error) {
        console.log(`   ❌ Error processing page: ${error.message}\n`);
      }
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`\n✅ Permission check complete!`);
    console.log(`\n💡 If a page is missing "pages_messaging" permission:`);
    console.log(`   1. Go to your dashboard's Integrations page`);
    console.log(`   2. Disconnect the problematic page`);
    console.log(`   3. Reconnect it and approve ALL permissions`);
    console.log(`\n${'='.repeat(60)}\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

checkPagePermissions();

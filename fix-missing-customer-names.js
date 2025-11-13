/**
 * Fix missing customer names in existing Facebook conversations
 * 
 * This script:
 * 1. Finds all Facebook conversations without customerName
 * 2. Fetches customer profile from Facebook API
 * 3. Updates conversation with customer name and profile
 */

const { PrismaClient } = require('@prisma/client');
const sodium = require('libsodium-wrappers');

const db = new PrismaClient();

// Encryption key from environment
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY not set in environment");
}

let encryptionKey = null;

/**
 * Initialize libsodium and encryption key
 */
async function initializeSodium() {
  if (!encryptionKey) {
    await sodium.ready;
    
    // Convert base64 key to Uint8Array
    const key = sodium.from_base64(ENCRYPTION_KEY, sodium.base64_variants.ORIGINAL);
    
    if (key.length !== sodium.crypto_secretbox_KEYBYTES) {
      throw new Error(`Invalid encryption key length. Expected ${sodium.crypto_secretbox_KEYBYTES} bytes`);
    }
    
    encryptionKey = key;
    console.log('✅ Encryption initialized\n');
  }
}

/**
 * Decrypt an encrypted value using libsodium
 */
async function decrypt(ciphertext) {
  await initializeSodium();
  
  const combined = sodium.from_base64(ciphertext, sodium.base64_variants.ORIGINAL);
  
  const nonceLength = sodium.crypto_secretbox_NONCEBYTES;
  const nonce = combined.slice(0, nonceLength);
  const cipher = combined.slice(nonceLength);
  
  const plaintext = sodium.crypto_secretbox_open_easy(cipher, nonce, encryptionKey);
  return sodium.to_string(plaintext);
}

/**
 * Fetch user profile from Facebook API
 */
async function getUserProfile(psid, accessToken) {
  const fields = ['first_name', 'last_name', 'profile_pic', 'locale'];
  const url = `https://graph.facebook.com/v21.0/${psid}?fields=${fields.join(',')}&access_token=${accessToken}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Facebook API error: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

/**
 * Main function to fix missing customer names
 */
async function fixMissingCustomerNames() {
  console.log('🔍 Finding Facebook conversations without customer names...\n');
  
  try {
    // Find all Facebook conversations without customerName
    const conversations = await db.conversation.findMany({
      where: {
        platform: 'FACEBOOK',
        customerName: null,
      },
      include: {
        pageConnection: {
          select: {
            pageId: true,
            pageName: true,
            pageAccessTokenEnc: true,
          },
        },
      },
    });
    
    console.log(`Found ${conversations.length} conversations without customer names\n`);
    
    if (conversations.length === 0) {
      console.log('✅ All conversations already have customer names!');
      return;
    }
    
    let successCount = 0;
    let failCount = 0;
    let privacyRestrictedCount = 0;
    
    for (const conversation of conversations) {
      try {
        console.log(`\n📝 Processing conversation ${conversation.id}`);
        console.log(`   PSID: ${conversation.psid}`);
        console.log(`   Page: ${conversation.pageConnection?.pageName || 'Unknown'}`);
        
        if (!conversation.pageConnection) {
          console.log(`   ⚠️  No page connection found, skipping...`);
          failCount++;
          continue;
        }
        
        // Decrypt page access token
        const pageAccessToken = decrypt(conversation.pageConnection.pageAccessTokenEnc);
        
        // Fetch customer profile from Facebook
        console.log(`   🔄 Fetching profile from Facebook...`);
        
        try {
          const profile = await getUserProfile(conversation.psid, pageAccessToken);
          
          const fullName = `${profile.first_name || 'Unknown'} ${profile.last_name || ''}`.trim();
          
          // Update conversation
          await db.conversation.update({
            where: { id: conversation.id },
            data: {
              customerName: fullName,
              meta: {
                ...(conversation.meta || {}),
                customerProfile: {
                  firstName: profile.first_name || 'Unknown',
                  lastName: profile.last_name || '',
                  fullName: fullName,
                  profilePicture: profile.profile_pic || null,
                  locale: profile.locale || 'en_US',
                  facebookUrl: `https://www.facebook.com/${conversation.psid}`,
                  cached: true,
                  cachedAt: new Date().toISOString(),
                },
                platform: 'facebook',
              },
            },
          });
          
          console.log(`   ✅ Updated: ${fullName}`);
          successCount++;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (apiError) {
          const errorMessage = apiError.message || String(apiError);
          
          // Check if it's a privacy restriction error
          const isPrivacyError = 
            errorMessage.includes('2018218') || 
            errorMessage.includes('2018247') ||
            errorMessage.includes('Insufficient permission');
          
          if (isPrivacyError) {
            console.log(`   ℹ️  Profile unavailable due to privacy restrictions`);
            console.log(`   📝 Using fallback name: Customer #${conversation.psid.slice(-4)}`);
            
            // Update with fallback name
            await db.conversation.update({
              where: { id: conversation.id },
              data: {
                customerName: `Customer #${conversation.psid.slice(-4)}`,
                meta: {
                  ...(conversation.meta || {}),
                  customerProfile: {
                    id: conversation.psid,
                    firstName: 'Customer',
                    lastName: `#${conversation.psid.slice(-4)}`,
                    fullName: `Customer #${conversation.psid.slice(-4)}`,
                    profilePicture: null,
                    locale: 'en_US',
                    facebookUrl: `https://www.facebook.com/${conversation.psid}`,
                    cached: true,
                    cachedAt: new Date().toISOString(),
                    note: 'Profile access restricted by Facebook (privacy protection)',
                  },
                  platform: 'facebook',
                },
              },
            });
            
            privacyRestrictedCount++;
          } else {
            console.log(`   ❌ API Error: ${errorMessage}`);
            failCount++;
          }
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        failCount++;
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   Total processed: ${conversations.length}`);
    console.log(`   ✅ Successfully updated: ${successCount}`);
    console.log(`   ℹ️  Privacy restricted (fallback): ${privacyRestrictedCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await db.$disconnect();
  }
}

// Run the script
fixMissingCustomerNames()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

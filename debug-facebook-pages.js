const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFacebookPages() {
    console.log('🔍 Debugging Facebook page configurations...\n');
    
    try {
        // Get all connected Facebook pages
        const pages = await prisma.pageConnection.findMany({
            include: {
                company: {
                    select: {
                        name: true
                    }
                }
            }
        });

        console.log('1. Connected Facebook Pages:');
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            console.log(`   ${i + 1}. ${page.pageName}`);
            console.log(`      Database ID: ${page.id}`);
            console.log(`      Facebook Page ID: ${page.pageId}`);
            console.log(`      Company: ${page.company?.name || 'N/A'}`);
            console.log(`      Subscribed: ${page.subscribed}`);
            console.log(`      Access Token (Encrypted): ${page.pageAccessTokenEnc ? 'Present' : 'MISSING'}`);
            console.log(`      Access Token Length: ${page.pageAccessTokenEnc ? page.pageAccessTokenEnc.length : 0} chars`);
            console.log('');
        }

        console.log('2. Testing Page Access Tokens:');
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            console.log(`   Testing: ${page.pageName}`);
            
            if (!page.pageAccessTokenEnc) {
                console.log(`   ❌ No access token stored`);
                continue;
            }

            try {
                // Decrypt the access token first
                const { decrypt } = require('./src/lib/encryption');
                const decryptedToken = await decrypt(page.pageAccessTokenEnc);
                
                // Test the access token by making a simple API call
                const response = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}?access_token=${decryptedToken}`);
                const data = await response.json();
                
                if (response.ok) {
                    console.log(`   ✅ Access token valid - Page: ${data.name}`);
                } else {
                    console.log(`   ❌ Access token invalid - Error: ${data.error?.message || 'Unknown error'}`);
                    console.log(`   Error Code: ${data.error?.code || 'N/A'}`);
                    console.log(`   Error Type: ${data.error?.type || 'N/A'}`);
                }
            } catch (error) {
                console.log(`   ❌ Error testing access token: ${error.message}`);
            }
            
            console.log('');
        }

        console.log('3. Testing Webhook Subscriptions:');
        
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            console.log(`   Checking: ${page.pageName}`);
            
            if (!page.pageAccessTokenEnc) {
                console.log(`   ❌ Cannot check - No access token`);
                continue;
            }

            try {
                // Decrypt the access token first
                const { decrypt } = require('./src/lib/encryption');
                const decryptedToken = await decrypt(page.pageAccessTokenEnc);
                
                // Check webhook subscriptions
                const response = await fetch(`https://graph.facebook.com/v19.0/${page.pageId}/subscribed_apps?access_token=${decryptedToken}`);
                const data = await response.json();
                
                if (response.ok) {
                    if (data.data && data.data.length > 0) {
                        console.log(`   ✅ Webhook subscribed - Apps: ${data.data.length}`);
                        data.data.forEach(app => {
                            console.log(`      App: ${app.name} (ID: ${app.id})`);
                        });
                    } else {
                        console.log(`   ⚠️ No webhook subscriptions found`);
                    }
                } else {
                    console.log(`   ❌ Error checking webhook: ${data.error?.message || 'Unknown error'}`);
                }
            } catch (error) {
                console.log(`   ❌ Error checking webhook: ${error.message}`);
            }
            
            console.log('');
        }

        console.log('4. Recommendations:');
        
        // Check for pages without access tokens
        const pagesWithoutTokens = pages.filter(p => !p.pageAccessTokenEnc);
        if (pagesWithoutTokens.length > 0) {
            console.log(`   🔧 ${pagesWithoutTokens.length} page(s) missing access tokens:`);
            pagesWithoutTokens.forEach(page => {
                console.log(`      - ${page.pageName} (${page.pageId})`);
            });
        }

        // Check for unsubscribed pages
        const unsubscribedPages = pages.filter(p => !p.subscribed);
        if (unsubscribedPages.length > 0) {
            console.log(`   🔧 ${unsubscribedPages.length} page(s) marked as unsubscribed:`);
            unsubscribedPages.forEach(page => {
                console.log(`      - ${page.pageName} (${page.pageId})`);
            });
        }

        if (pagesWithoutTokens.length === 0 && unsubscribedPages.length === 0) {
            console.log(`   ✅ All pages have access tokens and are subscribed`);
        }

    } catch (error) {
        console.error('Error debugging Facebook pages:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugFacebookPages();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Import the decrypt function
const { decrypt } = require('./src/lib/encryption');

async function fixAllPagesWebhook() {
    console.log('🔧 Fixing webhook subscriptions for ALL Facebook pages...\n');
    
    try {
        // Get all connected Facebook pages
        const pages = await prisma.pageConnection.findMany({
            include: {
                company: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' } // Process in connection order
        });

        if (pages.length === 0) {
            console.log('❌ No Facebook pages found in database');
            return;
        }

        console.log(`📋 Found ${pages.length} Facebook pages to process:\n`);
        
        // Display all pages first
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            console.log(`   ${i + 1}. ${page.pageName} (${page.pageId})`);
            console.log(`      Company: ${page.company.name}`);
            console.log(`      Current status: ${page.subscribed ? 'Subscribed' : 'Not subscribed'}`);
            console.log(`      Access token: ${page.pageAccessTokenEnc ? 'Present' : 'Missing'}`);
            console.log('');
        }

        // STEP 1: Unsubscribe all pages first (clean slate)
        console.log('🔄 STEP 1: Unsubscribing all pages (clean slate)...\n');
        
        for (const page of pages) {
            if (!page.pageAccessTokenEnc) {
                console.log(`   ⏭️ Skipping ${page.pageName} - no access token`);
                continue;
            }

            try {
                console.log(`   🔕 Unsubscribing ${page.pageName}...`);
                
                // Decrypt the access token
                const pageAccessToken = await decrypt(page.pageAccessTokenEnc);
                
                // Make the unsubscribe API call
                const unsubscribeResponse = await fetch(
                    `https://graph.facebook.com/v18.0/me/subscribed_apps?access_token=${pageAccessToken}`,
                    {
                        method: "DELETE",
                    }
                );

                if (unsubscribeResponse.ok) {
                    const result = await unsubscribeResponse.json();
                    console.log(`   ✅ Unsubscribed ${page.pageName}:`, result);
                    
                    // Update database
                    await prisma.pageConnection.update({
                        where: { id: page.id },
                        data: { subscribed: false }
                    });
                } else {
                    const error = await unsubscribeResponse.text();
                    console.log(`   ⚠️ Failed to unsubscribe ${page.pageName}: ${error}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error unsubscribing ${page.pageName}: ${error.message}`);
            }
        }

        // Wait a moment
        console.log('\n⏱️ Waiting 3 seconds before re-subscribing...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // STEP 2: Re-subscribe all pages properly
        console.log('🔄 STEP 2: Re-subscribing all pages properly...\n');
        
        const results = {
            successful: [],
            failed: []
        };

        for (const page of pages) {
            if (!page.pageAccessTokenEnc) {
                console.log(`   ⏭️ Skipping ${page.pageName} - no access token`);
                results.failed.push({ pageName: page.pageName, error: 'No access token' });
                continue;
            }

            try {
                console.log(`   🔔 Subscribing ${page.pageName}...`);
                
                // Decrypt the access token
                const pageAccessToken = await decrypt(page.pageAccessTokenEnc);
                
                // Make the subscribe API call with all required fields
                const subscribeResponse = await fetch(
                    `https://graph.facebook.com/v18.0/me/subscribed_apps`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            subscribed_fields: "messages,messaging_postbacks,message_deliveries,message_reads",
                            access_token: pageAccessToken,
                        }),
                    }
                );

                if (subscribeResponse.ok) {
                    const result = await subscribeResponse.json();
                    console.log(`   ✅ Subscribed ${page.pageName}:`, result);
                    
                    // Update database
                    await prisma.pageConnection.update({
                        where: { id: page.id },
                        data: { subscribed: true }
                    });
                    
                    results.successful.push(page.pageName);
                    
                    // Verify the subscription worked
                    const verifyResponse = await fetch(
                        `https://graph.facebook.com/v18.0/me/subscribed_apps?access_token=${pageAccessToken}`
                    );
                    
                    if (verifyResponse.ok) {
                        const verifyData = await verifyResponse.json();
                        const appId = process.env.FACEBOOK_APP_ID;
                        const hasSubscription = verifyData.data && verifyData.data.some(app => app.id === appId);
                        
                        if (hasSubscription) {
                            console.log(`   🔍 Verified: ${page.pageName} is properly subscribed`);
                        } else {
                            console.log(`   ⚠️ Warning: ${page.pageName} subscription not verified`);
                        }
                    }
                    
                } else {
                    const error = await subscribeResponse.text();
                    console.log(`   ❌ Failed to subscribe ${page.pageName}: ${error}`);
                    results.failed.push({ pageName: page.pageName, error });
                }
                
                // Small delay between subscriptions
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.log(`   ❌ Error subscribing ${page.pageName}: ${error.message}`);
                results.failed.push({ pageName: page.pageName, error: error.message });
            }
        }

        // STEP 3: Final report
        console.log('\n📊 FINAL RESULTS:\n');
        
        console.log(`✅ Successfully subscribed pages (${results.successful.length}):`);
        results.successful.forEach(pageName => {
            console.log(`   - ${pageName}`);
        });
        
        if (results.failed.length > 0) {
            console.log(`\n❌ Failed subscriptions (${results.failed.length}):`);
            results.failed.forEach(failure => {
                console.log(`   - ${failure.pageName}: ${failure.error}`);
            });
        }

        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Send test messages to all pages to verify webhooks work');
        console.log('2. Check your app logs for incoming webhook calls');
        console.log('3. If still having issues, check Facebook App webhook configuration');

        console.log('\n💡 IMPORTANT: All pages should now receive webhooks equally!');

    } catch (error) {
        console.error('❌ Error fixing all pages webhook:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixAllPagesWebhook();
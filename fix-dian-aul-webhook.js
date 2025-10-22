const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDianAulWebhook() {
    console.log('🔧 Fixing webhook subscription for "Dian Aul" page...\n');
    
    try {
        // Find the Dian Aul page
        const page = await prisma.pageConnection.findFirst({
            where: {
                pageName: 'Dian Aul'
            }
        });

        if (!page) {
            console.log('❌ "Dian Aul" page not found in database');
            return;
        }

        console.log(`📄 Found page: ${page.pageName}`);
        console.log(`   Facebook Page ID: ${page.pageId}`);
        console.log(`   Database ID: ${page.id}`);
        console.log(`   Current subscribed status: ${page.subscribed}\n`);

        // Option 1: Update subscription status via API
        console.log('🔄 Attempting to refresh webhook subscription via API...\n');

        try {
            const response = await fetch('/api/settings/page/subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    pageId: page.pageId,
                    subscribe: false // First unsubscribe
                })
            });

            if (response.ok) {
                console.log('✅ Unsubscribed from webhooks');
                
                // Wait a moment
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Re-subscribe
                const resubscribeResponse = await fetch('/api/settings/page/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        pageId: page.pageId,
                        subscribe: true // Re-subscribe
                    })
                });

                if (resubscribeResponse.ok) {
                    console.log('✅ Re-subscribed to webhooks');
                } else {
                    console.log('❌ Failed to re-subscribe');
                }
            } else {
                console.log('❌ API call failed - trying manual database update');
            }
        } catch (apiError) {
            console.log(`❌ API call failed: ${apiError.message}`);
            console.log('📝 Trying alternative approach...\n');
        }

        // Alternative: Check the recent connection vs working page
        console.log('🔍 Comparing with working "Big Chonky Cats" page:\n');
        
        const workingPage = await prisma.pageConnection.findFirst({
            where: {
                pageName: 'Big Chonky Cats'
            }
        });

        if (workingPage) {
            console.log('📊 Comparison:');
            console.log(`   Dian Aul created: ${page.createdAt}`);
            console.log(`   Big Chonky Cats created: ${workingPage.createdAt}`);
            console.log(`   Time difference: ${Math.abs(new Date(workingPage.createdAt) - new Date(page.createdAt))}ms`);
            console.log('');
            
            // Check if there's a significant difference in connection time
            const timeDiff = Math.abs(new Date(workingPage.createdAt) - new Date(page.createdAt));
            if (timeDiff < 2 * 60 * 1000) { // Less than 2 minutes apart
                console.log('⚠️ Both pages were connected very close together - possible race condition');
                console.log('💡 Suggestion: The second page connection might have failed webhook setup');
            }
        }

        // Provide manual fix instructions
        console.log('\n🛠️ Manual Fix Options:\n');
        
        console.log('Option 1 - Reconnect via UI:');
        console.log('1. Go to your integrations page');
        console.log('2. Click the "Disconnect" button for "Dian Aul"');
        console.log('3. Click "Add Integration" and reconnect the "Dian Aul" page');
        console.log('4. This will refresh the webhook subscription\n');

        console.log('Option 2 - Check Facebook App Dashboard:');
        console.log('1. Go to Facebook App Dashboard');
        console.log('2. Navigate to Webhooks section');
        console.log('3. Check if "Dian Aul" page is properly subscribed');
        console.log('4. If not, manually subscribe it to your webhook URL\n');

        console.log('Option 3 - Database Reset:');
        console.log('1. Update the subscribed status to false');
        console.log('2. Use the subscribe API to re-enable webhooks\n');

        // Try to update the page to force re-subscription
        console.log('🔄 Attempting database subscription reset...\n');
        
        try {
            // First set to false
            await prisma.pageConnection.update({
                where: { id: page.id },
                data: { subscribed: false }
            });
            console.log('✅ Set subscription status to false');
            
            // Wait a moment
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Set back to true
            await prisma.pageConnection.update({
                where: { id: page.id },
                data: { subscribed: true }
            });
            console.log('✅ Set subscription status back to true');
            
            console.log('\n🎯 Database updated! Now try:');
            console.log('1. Send a test message to "Dian Aul" Facebook page');
            console.log('2. Check if the webhook is received');
            console.log('3. If still not working, try the manual reconnection option');
            
        } catch (dbError) {
            console.log(`❌ Database update failed: ${dbError.message}`);
        }

    } catch (error) {
        console.error('❌ Error fixing Dian Aul webhook:', error);
    } finally {
        await prisma.$disconnect();
    }
}

fixDianAulWebhook();
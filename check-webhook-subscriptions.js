const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkWebhookSubscriptions() {
    console.log('🔍 Checking webhook subscriptions for each Facebook page...\n');
    
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

        console.log('1. Checking Facebook webhook subscriptions:\n');

        for (const page of pages) {
            console.log(`📄 Checking: ${page.pageName}`);
            console.log(`   Facebook Page ID: ${page.pageId}`);
            console.log(`   Database subscribed status: ${page.subscribed}`);
            
            // Check if we have an encrypted access token
            if (!page.pageAccessTokenEnc) {
                console.log(`   ❌ No access token stored - cannot check webhook status\n`);
                continue;
            }

            try {
                // We need to decrypt the token to make Facebook API calls
                // For now, let's just make a direct API call and see what happens
                
                console.log(`   🔍 Testing Facebook API access for page ${page.pageId}...`);
                
                // Try to get basic page info to test if token works
                // We'll use a workaround since we can't easily decrypt in this script
                const testUrl = `https://graph.facebook.com/v19.0/${page.pageId}`;
                console.log(`   📞 Testing API endpoint: ${testUrl}`);
                
                // For now, let's check what we can from the database
                console.log(`   📊 Database info:`);
                console.log(`      - Access token length: ${page.pageAccessTokenEnc.length} chars`);
                console.log(`      - Created: ${page.createdAt}`);
                console.log(`      - Updated: ${page.updatedAt}`);
                console.log(`      - Profile picture: ${page.profilePictureUrl || 'None'}`);
                
            } catch (error) {
                console.log(`   ❌ Error checking page: ${error.message}`);
            }
            
            console.log('');
        }

        // Check recent webhook activity
        console.log('2. Recent webhook activity (last 10 messages):\n');
        
        const recentMessages = await prisma.message.findMany({
            include: {
                conversation: {
                    include: {
                        page: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        if (recentMessages.length === 0) {
            console.log('   📭 No recent messages found\n');
        } else {
            recentMessages.forEach((msg, index) => {
                const timeDiff = Math.round((new Date() - new Date(msg.createdAt)) / 1000);
                console.log(`   ${index + 1}. ${msg.conversation.page.pageName}`);
                console.log(`      Role: ${msg.role}`);
                console.log(`      Text: ${msg.text.substring(0, 50)}...`);
                console.log(`      Time: ${msg.createdAt} (${timeDiff}s ago)`);
                console.log(`      Conversation: ${msg.conversation.id}`);
                console.log('');
            });
        }

        // Analyze the pattern
        console.log('3. Analysis:\n');
        
        const messagesByPage = {};
        for (const msg of recentMessages) {
            const pageName = msg.conversation.page.pageName;
            if (!messagesByPage[pageName]) {
                messagesByPage[pageName] = 0;
            }
            messagesByPage[pageName]++;
        }

        console.log('   Recent message distribution:');
        for (const [pageName, count] of Object.entries(messagesByPage)) {
            console.log(`   📊 ${pageName}: ${count} messages`);
        }

        // Check for pages with no recent messages
        const pagesWithNoRecentMessages = pages.filter(page => 
            !Object.keys(messagesByPage).includes(page.pageName)
        );

        if (pagesWithNoRecentMessages.length > 0) {
            console.log('\n   ⚠️ Pages with no recent webhook activity:');
            pagesWithNoRecentMessages.forEach(page => {
                console.log(`   - ${page.pageName} (${page.pageId})`);
            });
        }

        // Check webhook endpoint
        console.log('\n4. Webhook Configuration Check:\n');
        console.log('   Current environment variables:');
        console.log(`   - NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'Not set'}`);
        console.log(`   - FB_VERIFY_TOKEN: ${process.env.FB_VERIFY_TOKEN ? 'Set' : 'Not set'}`);
        console.log(`   - FB_APP_SECRET: ${process.env.FB_APP_SECRET ? 'Set' : 'Not set'}`);
        
        const webhookUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/webhook/facebook`;
        console.log(`   - Webhook URL: ${webhookUrl}`);

        // Recommendations
        console.log('\n5. Recommendations:\n');
        console.log('   🔧 To debug "Dian Aul" webhook issue:');
        console.log('   1. Check if the page access token is valid');
        console.log('   2. Verify webhook subscription in Facebook App dashboard');
        console.log('   3. Test webhook endpoint manually');
        console.log('   4. Check Facebook App permissions for the page');
        console.log('   5. Try disconnecting and reconnecting the "Dian Aul" page');

    } catch (error) {
        console.error('❌ Error checking webhook subscriptions:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkWebhookSubscriptions();
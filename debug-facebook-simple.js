const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugFacebookPagesSimple() {
    console.log('🔍 Debugging Facebook page configurations (Simple)...\n');
    
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

        // Get conversation counts per page
        console.log('2. Message Activity by Page:');
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            
            // Count conversations
            const conversationCount = await prisma.conversation.count({
                where: { pageId: page.id }
            });
            
            // Count messages
            const messageCount = await prisma.message.count({
                where: { 
                    conversation: { 
                        pageId: page.id 
                    } 
                }
            });
            
            // Get latest message date
            const latestMessage = await prisma.message.findFirst({
                where: { 
                    conversation: { 
                        pageId: page.id 
                    } 
                },
                orderBy: { createdAt: 'desc' }
            });
            
            console.log(`   ${page.pageName}:`);
            console.log(`      Conversations: ${conversationCount}`);
            console.log(`      Messages: ${messageCount}`);
            console.log(`      Last Message: ${latestMessage ? latestMessage.createdAt.toISOString() : 'Never'}`);
            console.log('');
        }

        // Check webhook configuration from environment
        console.log('3. Webhook Configuration:');
        console.log(`   Webhook URL: ${process.env.NEXTAUTH_URL || 'Not set'}/api/webhook/facebook`);
        console.log(`   FB_VERIFY_TOKEN: ${process.env.FB_VERIFY_TOKEN ? 'Set' : 'Not set'}`);
        console.log(`   FB_APP_SECRET: ${process.env.FB_APP_SECRET ? 'Set' : 'Not set'}`);
        console.log(`   FACEBOOK_APP_ID: ${process.env.FACEBOOK_APP_ID ? 'Set' : 'Not set'}`);
        
        // Analyze the issue
        console.log('\n4. Issue Analysis:');
        
        // Check which pages have no messages
        const pagesWithNoMessages = [];
        const pagesWithMessages = [];
        
        for (const page of pages) {
            const messageCount = await prisma.message.count({
                where: { 
                    conversation: { 
                        pageId: page.id 
                    } 
                }
            });
            
            if (messageCount === 0) {
                pagesWithNoMessages.push(page);
            } else {
                pagesWithMessages.push(page);
            }
        }
        
        console.log(`   Pages with messages: ${pagesWithMessages.length}`);
        pagesWithMessages.forEach(page => {
            console.log(`      ✅ ${page.pageName}`);
        });
        
        console.log(`   Pages without messages: ${pagesWithNoMessages.length}`);
        pagesWithNoMessages.forEach(page => {
            console.log(`      ❌ ${page.pageName} (${page.subscribed ? 'subscribed' : 'not subscribed'})`);
        });
        
        // Recommendations
        console.log('\n5. Recommendations:');
        if (pagesWithNoMessages.length > 0) {
            console.log('   🔧 Pages with no messages detected. Possible causes:');
            console.log('      1. Facebook webhook not properly configured for these pages');
            console.log('      2. Access tokens may be expired or invalid');
            console.log('      3. App not properly subscribed to page webhook events');
            console.log('      4. No actual messages have been sent to these pages');
            console.log('');
            console.log('   📝 To fix:');
            console.log('      1. Test webhook endpoint manually');
            console.log('      2. Re-authenticate these pages to refresh tokens');
            console.log('      3. Check Facebook App webhook configuration');
            console.log('      4. Send a test message to verify webhook delivery');
        } else {
            console.log('   ✅ All pages have received messages - system working correctly');
        }

    } catch (error) {
        console.error('Error debugging Facebook pages:', error);
    } finally {
        await prisma.$disconnect();
    }
}

debugFacebookPagesSimple();
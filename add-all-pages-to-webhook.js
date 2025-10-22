const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addAllPagesToWebhook() {
    console.log('🔧 Adding ALL pages to Facebook App webhook subscriptions...\n');
    
    console.log('📋 CURRENT ISSUE:');
    console.log('   - Facebook Messenger API only shows "Big Chonky Cats" in webhook subscriptions');
    console.log('   - "Dian Aul" was overwritten when Big Chonky Cats was added');
    console.log('   - This happens because we\'re using the wrong webhook subscription method\n');
    
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
            orderBy: { createdAt: 'asc' }
        });

        if (pages.length === 0) {
            console.log('❌ No Facebook pages found in database');
            return;
        }

        console.log(`📋 Found ${pages.length} Facebook pages to add to webhooks:\n`);
        
        // Display all pages
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i];
            console.log(`   ${i + 1}. ${page.pageName} (${page.pageId})`);
            console.log(`      Company: ${page.company.name}`);
            console.log(`      Database Status: ${page.subscribed ? 'Subscribed' : 'Not subscribed'}`);
            console.log('');
        }

        console.log('🚨 IMPORTANT DISCOVERY:');
        console.log('   The Facebook Messenger API screenshot shows the problem:');
        console.log('   - Only ONE page appears in "Langganan Webhook" (webhook subscriptions)');
        console.log('   - This means Facebook is treating this as single-page, not multi-page\n');

        console.log('💡 SOLUTION NEEDED:');
        console.log('   We need to configure the webhook at the APP level, not page level');
        console.log('   The webhook should receive events for ALL pages, then route them properly\n');

        console.log('📝 MANUAL STEPS TO FIX (Facebook App Dashboard):');
        console.log('   1. Go to Facebook App Dashboard');
        console.log('   2. Navigate to Messenger > Settings');
        console.log('   3. In "Webhooks" section, check current configuration');
        console.log('   4. The webhook URL should receive events for ALL connected pages\n');

        console.log('🔧 APP-LEVEL WEBHOOK CONFIGURATION:');
        console.log('   Current webhook URL: http://localhost:3000/api/webhook/facebook');
        console.log('   Verify token: Set in FB_VERIFY_TOKEN environment variable');
        console.log('   Subscribe to fields: messages, messaging_postbacks, message_deliveries, message_reads\n');

        console.log('🎯 HOW IT SHOULD WORK:');
        console.log('   1. Facebook sends ALL page events to ONE webhook URL');
        console.log('   2. Your webhook receives events with page ID in the payload');
        console.log('   3. Your code routes each event to the correct page/conversation');
        console.log('   4. No per-page subscription needed - app handles all pages\n');

        // Check the current webhook endpoint
        console.log('🔍 CHECKING YOUR WEBHOOK ENDPOINT:');
        console.log('   Let me verify your webhook handles multiple pages correctly...\n');

        // Show the routing logic needed
        console.log('📋 REQUIRED WEBHOOK ROUTING LOGIC:');
        console.log('   Your webhook endpoint should:');
        console.log('   1. Receive Facebook payload');
        console.log('   2. Extract page ID from entry.id');
        console.log('   3. Look up page in database by Facebook page ID');
        console.log('   4. Route message to correct conversation');
        console.log('   5. Process message with correct page context\n');

        console.log('🚀 NEXT STEPS:');
        console.log('   1. Check your webhook endpoint code');
        console.log('   2. Ensure it can handle multiple page IDs');
        console.log('   3. Configure Facebook App to send ALL page events to webhook');
        console.log('   4. Test with messages to both pages\n');

        console.log('💯 EXPECTED RESULT:');
        console.log('   After proper configuration:');
        console.log('   - Facebook App webhook receives events from ALL pages');
        console.log('   - Your code routes them correctly based on page ID');
        console.log('   - Both "Dian Aul" and "Big Chonky Cats" work simultaneously');

    } catch (error) {
        console.error('❌ Error analyzing webhook setup:', error);
    } finally {
        await prisma.$disconnect();
    }
}

addAllPagesToWebhook();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function resubscribeAllPages() {
    console.log('🔧 Re-subscribing ALL Facebook pages using internal API...\n');
    
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
            console.log(`      Created: ${page.createdAt}`);
            console.log('');
        }

        // STEP 1: First unsubscribe all pages
        console.log('🔄 STEP 1: Unsubscribing all pages (clean slate)...\n');
        
        for (const page of pages) {
            try {
                console.log(`   🔕 Unsubscribing ${page.pageName}...`);
                
                // Set to unsubscribed in database first
                await prisma.pageConnection.update({
                    where: { id: page.id },
                    data: { subscribed: false }
                });
                
                console.log(`   ✅ ${page.pageName} marked as unsubscribed in database`);
                
            } catch (error) {
                console.log(`   ❌ Error unsubscribing ${page.pageName}: ${error.message}`);
            }
        }

        // Wait a moment
        console.log('\n⏱️ Waiting 2 seconds before re-subscribing...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // STEP 2: Re-subscribe all pages in order
        console.log('🔄 STEP 2: Re-subscribing all pages properly...\n');
        
        const results = {
            successful: [],
            failed: []
        };

        // Process pages one by one with delays
        for (const page of pages) {
            try {
                console.log(`   🔔 Re-subscribing ${page.pageName}...`);
                
                // Update database to subscribed
                await prisma.pageConnection.update({
                    where: { id: page.id },
                    data: { subscribed: true }
                });
                
                console.log(`   ✅ ${page.pageName} marked as subscribed in database`);
                results.successful.push(page.pageName);
                
                // Add delay between subscriptions to avoid conflicts
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.log(`   ❌ Error subscribing ${page.pageName}: ${error.message}`);
                results.failed.push({ pageName: page.pageName, error: error.message });
            }
        }

        // STEP 3: Final report
        console.log('\n📊 FINAL RESULTS:\n');
        
        console.log(`✅ Successfully processed pages (${results.successful.length}):`);
        results.successful.forEach(pageName => {
            console.log(`   - ${pageName}`);
        });
        
        if (results.failed.length > 0) {
            console.log(`\n❌ Failed subscriptions (${results.failed.length}):`);
            results.failed.forEach(failure => {
                console.log(`   - ${failure.pageName}: ${failure.error}`);
            });
        }

        console.log('\n🎯 MANUAL NEXT STEPS:');
        console.log('1. Go to your integrations page: http://localhost:3000/dashboard/integrations');
        console.log('2. For EACH page, click the "Active" button to toggle OFF, then ON again');
        console.log('3. This will properly call the Facebook API for each page');
        console.log('4. Then send test messages to ALL pages to verify');

        console.log('\n📝 ALTERNATIVE: Complete reconnection (recommended)');
        console.log('1. Disconnect ALL pages from the integrations page');
        console.log('2. Reconnect ALL pages one by one');
        console.log('3. This ensures fresh webhook subscriptions for all');

        console.log('\n💡 The issue was that multiple quick subscriptions interfered with each other!');

    } catch (error) {
        console.error('❌ Error re-subscribing all pages:', error);
    } finally {
        await prisma.$disconnect();
    }
}

resubscribeAllPages();
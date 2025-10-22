const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugWidgetAutoBot() {
  console.log('🔍 Debugging Widget AutoBot Configuration\n');

  try {
    // Get all widget configs
    const widgetConfigs = await prisma.widgetConfig.findMany({
      select: {
        id: true,
        companyId: true,
        widgetName: true,
        autoBot: true,
        enabled: true,
      }
    });

    console.log(`📊 Found ${widgetConfigs.length} widget config(s):\n`);
    widgetConfigs.forEach((config, index) => {
      console.log(`${index + 1}. Widget Config:`);
      console.log(`   ID: ${config.id}`);
      console.log(`   Company ID: ${config.companyId}`);
      console.log(`   Widget Name: ${config.widgetName}`);
      console.log(`   AutoBot: ${config.autoBot ? '✅ ON' : '❌ OFF'}`);
      console.log(`   Enabled: ${config.enabled ? '✅ ON' : '❌ OFF'}`);
      console.log('');
    });

    // Get recent widget conversations
    console.log('💬 Recent Widget Conversations:\n');
    const conversations = await prisma.conversation.findMany({
      where: {
        platform: 'WIDGET',
      },
      select: {
        id: true,
        psid: true,
        autoBot: true,
        customerName: true,
        createdAt: true,
        widgetConfig: {
          select: {
            widgetName: true,
            autoBot: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    if (conversations.length === 0) {
      console.log('   No widget conversations found yet.\n');
    } else {
      conversations.forEach((conv, index) => {
        console.log(`${index + 1}. Conversation ${conv.id}:`);
        console.log(`   Customer: ${conv.customerName || conv.psid}`);
        console.log(`   Conversation AutoBot: ${conv.autoBot ? '✅ ON' : '❌ OFF'}`);
        console.log(`   Widget Config AutoBot: ${conv.widgetConfig?.autoBot ? '✅ ON' : '❌ OFF'}`);
        console.log(`   Created: ${conv.createdAt}`);
        console.log('');
      });
    }

    // Check if there's a mismatch
    console.log('\n⚠️  IMPORTANT NOTES:');
    console.log('1. The conversation autoBot is set when the conversation is CREATED');
    console.log('2. If you toggled autoBot AFTER creating the conversation, it won\'t affect existing conversations');
    console.log('3. Only NEW conversations will use the current widget config autoBot setting');
    console.log('\n💡 SOLUTION:');
    console.log('If autoBot is ON in widget config but OFF in conversation:');
    console.log('   → Start a NEW widget conversation to test');
    console.log('   → Delete old test conversations first');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugWidgetAutoBot();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateWidgetConversationsAutoBot() {
  console.log('🔄 Updating AutoBot for existing widget conversations...\n');

  try {
    // Get widget config
    const widgetConfig = await prisma.widgetConfig.findFirst({
      select: {
        id: true,
        companyId: true,
        autoBot: true,
      }
    });

    if (!widgetConfig) {
      console.log('❌ No widget config found');
      return;
    }

    console.log(`Widget Config AutoBot: ${widgetConfig.autoBot ? '✅ ON' : '❌ OFF'}\n`);

    if (!widgetConfig.autoBot) {
      console.log('⚠️  Widget config autoBot is OFF. No need to update conversations.');
      return;
    }

    // Update all widget conversations to match widget config
    const result = await prisma.conversation.updateMany({
      where: {
        widgetConfigId: widgetConfig.id,
        autoBot: false, // Only update conversations that are currently OFF
      },
      data: {
        autoBot: true,
      }
    });

    console.log(`✅ Updated ${result.count} conversation(s) to autoBot: ON\n`);

    // Show updated conversations
    const conversations = await prisma.conversation.findMany({
      where: {
        widgetConfigId: widgetConfig.id,
      },
      select: {
        id: true,
        customerName: true,
        psid: true,
        autoBot: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10,
    });

    console.log('📊 Current Widget Conversations:');
    conversations.forEach((conv, index) => {
      console.log(`${index + 1}. ${conv.customerName || conv.psid} - AutoBot: ${conv.autoBot ? '✅ ON' : '❌ OFF'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateWidgetConversationsAutoBot();

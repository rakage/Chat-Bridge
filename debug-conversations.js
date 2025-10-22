// Debug script to check conversation routing for multiple Facebook pages
const { PrismaClient } = require('@prisma/client');

async function debugConversations() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Debugging conversation routing...\n');
    
    // 1. Check all page connections
    console.log('1. Page Connections:');
    const pageConnections = await prisma.pageConnection.findMany({
      include: { company: true },
      orderBy: { createdAt: 'desc' }
    });
    
    pageConnections.forEach((page, index) => {
      console.log(`   ${index + 1}. ${page.pageName}`);
      console.log(`      Database ID: ${page.id}`);
      console.log(`      Facebook Page ID: ${page.pageId}`);
      console.log(`      Company: ${page.company.name}`);
      console.log(`      Subscribed: ${page.subscribed}`);
      console.log('');
    });
    
    // 2. Check all conversations
    console.log('2. Conversations by Page:');
    const conversations = await prisma.conversation.findMany({
      include: {
        page: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { messages: true }
        }
      },
      orderBy: { lastMessageAt: 'desc' }
    });
    
    // Group conversations by page
    const conversationsByPage = conversations.reduce((acc, conv) => {
      const pageId = conv.page.id;
      if (!acc[pageId]) {
        acc[pageId] = {
          pageName: conv.page.pageName,
          facebookPageId: conv.page.pageId,
          conversations: []
        };
      }
      acc[pageId].conversations.push(conv);
      return acc;
    }, {});
    
    Object.entries(conversationsByPage).forEach(([dbPageId, data]) => {
      console.log(`   Page: ${data.pageName} (DB ID: ${dbPageId}, FB ID: ${data.facebookPageId})`);
      data.conversations.forEach((conv, index) => {
        const lastMessage = conv.messages[0];
        console.log(`      ${index + 1}. Conversation ${conv.id.slice(-8)}`);
        console.log(`         PSID: ${conv.psid}`);
        console.log(`         Messages: ${conv._count.messages}`);
        console.log(`         Last Message: ${lastMessage ? lastMessage.text.substring(0, 50) + '...' : 'None'}`);
        console.log(`         Last Message At: ${conv.lastMessageAt.toISOString()}`);
        console.log('');
      });
    });
    
    // 3. Check for potential issues
    console.log('3. Potential Issues:');
    
    // Check for conversations with same PSID across different pages
    const psidCounts = conversations.reduce((acc, conv) => {
      if (!acc[conv.psid]) {
        acc[conv.psid] = [];
      }
      acc[conv.psid].push({
        conversationId: conv.id,
        pageId: conv.pageId,
        pageName: conv.page.pageName
      });
      return acc;
    }, {});
    
    const duplicatePsids = Object.entries(psidCounts).filter(([psid, convs]) => convs.length > 1);
    
    if (duplicatePsids.length > 0) {
      console.log('   ⚠️  Found conversations with same PSID across different pages:');
      duplicatePsids.forEach(([psid, convs]) => {
        console.log(`      PSID ${psid}:`);
        convs.forEach(conv => {
          console.log(`         - Conversation ${conv.conversationId.slice(-8)} on ${conv.pageName}`);
        });
      });
    } else {
      console.log('   ✅ No duplicate PSIDs found across pages');
    }
    
    // 4. Recent messages summary
    console.log('\n4. Recent Messages (Last 10):');
    const recentMessages = await prisma.message.findMany({
      include: {
        conversation: {
          include: { page: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    recentMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg.role} message on ${msg.conversation.page.pageName}`);
      console.log(`      Text: ${msg.text.substring(0, 60)}...`);
      console.log(`      Time: ${msg.createdAt.toISOString()}`);
      console.log(`      Conversation: ${msg.conversation.id.slice(-8)}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugConversations();
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { socketService } from '@/lib/socket';

// CORS headers for widget (public endpoint)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sessionId = searchParams.get('sessionId');
    const companyId = searchParams.get('companyId');

    if (!sessionId || !companyId) {
      return NextResponse.json(
        { error: 'Missing sessionId or companyId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const widgetConfig = await db.widgetConfig.findUnique({
      where: { companyId },
    });

    if (!widgetConfig) {
      return NextResponse.json(
        { error: 'Widget not found' },
        { status: 404 }
      );
    }

    const conversation = await db.conversation.findFirst({
      where: {
        widgetConfigId: widgetConfig.id,
        psid: sessionId,
        status: {
          in: ["OPEN", "SNOOZED"],
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ messages: [] }, { headers: corsHeaders });
    }

    return NextResponse.json({
      messages: conversation.messages,
      conversationId: conversation.id,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Widget messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, companyId, message } = await req.json();

    if (!sessionId || !companyId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    const widgetConfig = await db.widgetConfig.findUnique({
      where: { companyId },
      include: {
        company: true,
      },
    });

    if (!widgetConfig) {
      return NextResponse.json(
        { error: 'Widget not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const conversation = await db.conversation.findFirst({
      where: {
        widgetConfigId: widgetConfig.id,
        psid: sessionId,
        status: {
          in: ["OPEN", "SNOOZED"],
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const newMessage = await db.message.create({
      data: {
        conversationId: conversation.id,
        role: 'USER',
        text: message,
      },
    });

    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Emit Socket.io events like Facebook/Instagram webhooks do
    try {
      const messageEvent = {
        message: {
          id: newMessage.id,
          text: newMessage.text,
          role: newMessage.role,
          createdAt: newMessage.createdAt.toISOString(),
          meta: newMessage.meta,
        },
        conversation: {
          id: conversation.id,
          psid: conversation.psid,
          status: conversation.status,
          autoBot: conversation.autoBot,
          platform: 'WIDGET',
        },
      };

      console.log(`💬 Emitting widget message:new to conversation:${conversation.id}`, messageEvent);

      // Emit to conversation room for active viewers
      socketService.emitToConversation(
        conversation.id,
        'message:new',
        messageEvent
      );

      // Emit to company room for conversation list updates
      socketService.emitToCompany(
        widgetConfig.companyId,
        'message:new',
        messageEvent
      );

      // Emit conversation:view-update for real-time UI updates (for ConversationsList)
      socketService.emitToCompany(
        widgetConfig.companyId,
        'conversation:view-update',
        {
          conversationId: conversation.id,
          type: 'new_message',
          message: {
            text: newMessage.text,
            role: newMessage.role,
            createdAt: newMessage.createdAt.toISOString(),
          },
          lastMessageAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        }
      );

      // Also emit conversation:updated for statistics
      const messageCount = await db.message.count({
        where: { conversationId: conversation.id },
      });

      socketService.emitToCompany(
        widgetConfig.companyId,
        'conversation:updated',
        {
          conversationId: conversation.id,
          lastMessageAt: new Date().toISOString(),
          messageCount: messageCount,
        }
      );

      console.log(`✅ Widget message events emitted to company ${widgetConfig.companyId}`);
    } catch (socketError) {
      console.error('Failed to emit widget message events:', socketError);
      // Don't fail the request if socket emit fails
    }

    // Handle auto-bot response if enabled
    if (conversation.autoBot) {
      console.log(`🤖 Auto-bot enabled for widget conversation ${conversation.id}`);
      
      // Emit bot typing indicator
      try {
        socketService.emitToConversation(
          conversation.id,
          'bot:typing',
          { conversationId: conversation.id }
        );
        console.log(`⌨️  Bot typing indicator sent to conversation ${conversation.id}`);
      } catch (typingError) {
        console.error('Failed to emit bot typing:', typingError);
      }
      
      try {
        // Import RAGChatbot dynamically to avoid circular dependencies
        const { RAGChatbot } = await import('@/lib/rag-chatbot');
        
        // Get provider config for the company
        const providerConfig = await db.providerConfig.findUnique({
          where: { companyId: widgetConfig.companyId },
        });

        // Generate bot response using RAG with provider config
        const botResponse = await RAGChatbot.generateResponse(
          message,
          widgetConfig.companyId,
          conversation.id,
          {
            similarityThreshold: 0.1, // Lower threshold for better recall
            searchLimit: 5,
            temperature: providerConfig?.temperature || 0.7,
            maxTokens: providerConfig?.maxTokens || 1000,
            systemPrompt: providerConfig?.systemPrompt,
            providerConfig: providerConfig,
          }
        );

        // Log token usage for Widget auto-bot responses
        if (botResponse.usage && botResponse.usage.totalTokens > 0) {
          try {
            await db.usageLog.create({
              data: {
                companyId: widgetConfig.companyId,
                type: "AUTO_RESPONSE",
                provider: providerConfig?.provider || "GEMINI",
                model: providerConfig?.model || "gemini-1.5-flash",
                inputTokens: botResponse.usage.promptTokens || 0,
                outputTokens: botResponse.usage.completionTokens || 0,
                totalTokens: botResponse.usage.totalTokens || 0,
                metadata: {
                  conversationId: conversation.id,
                  message: message.substring(0, 100),
                  platform: "widget",
                  source: "widget",
                  isAutoBot: true,
                },
              },
            });
            console.log(`✅ Logged ${botResponse.usage.totalTokens} tokens (${botResponse.usage.promptTokens} prompt + ${botResponse.usage.completionTokens} completion) for Widget auto-bot`);
          } catch (logError) {
            console.error('⚠️ Failed to log token usage:', logError);
            // Don't fail the message if logging fails
          }
        }

        if (botResponse.response) {
          // Save bot response to database
          const botMessage = await db.message.create({
            data: {
              conversationId: conversation.id,
              text: botResponse.response,
              role: 'BOT',
              providerUsed: botResponse.usage ? 'OPENAI' : undefined,
              meta: JSON.parse(JSON.stringify({
                ragContext: botResponse.context,
                ragUsage: botResponse.usage,
              })),
            },
          });

          console.log(`✅ Bot response generated for widget: ${botMessage.text.substring(0, 100)}...`);

          // Emit bot message to conversation room
          const botMessageEvent = {
            message: {
              id: botMessage.id,
              text: botMessage.text,
              role: botMessage.role,
              createdAt: botMessage.createdAt.toISOString(),
              meta: botMessage.meta,
            },
            conversation: {
              id: conversation.id,
              psid: conversation.psid,
              status: conversation.status,
              autoBot: conversation.autoBot,
              platform: 'WIDGET',
            },
          };

          // Emit to conversation room for widget to receive
          socketService.emitToConversation(
            conversation.id,
            'message:new',
            botMessageEvent
          );

          // Emit to company room for dashboard
          socketService.emitToCompany(
            widgetConfig.companyId,
            'message:new',
            botMessageEvent
          );

          // Emit conversation:view-update for real-time UI updates
          socketService.emitToCompany(
            widgetConfig.companyId,
            'conversation:view-update',
            {
              conversationId: conversation.id,
              type: 'new_message',
              message: {
                text: botMessage.text,
                role: botMessage.role,
                createdAt: botMessage.createdAt.toISOString(),
              },
              lastMessageAt: new Date().toISOString(),
              autoBot: conversation.autoBot,
              timestamp: new Date().toISOString(),
            }
          );

          console.log(`✅ Widget bot message events emitted to company ${widgetConfig.companyId}`);
        }
      } catch (botError) {
        console.error('Widget auto-bot response failed:', botError);
        // Don't fail the request if bot response fails
      } finally {
        // Hide typing indicator (in case of error or success)
        try {
          socketService.emitToConversation(
            conversation.id,
            'bot:stopped-typing',
            { conversationId: conversation.id }
          );
        } catch (typingError) {
          console.error('Failed to emit bot stopped typing:', typingError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: newMessage,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Widget send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

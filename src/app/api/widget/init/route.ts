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

export async function POST(req: NextRequest) {
  try {
    const { companyId, name, email, message, sessionId } = await req.json();

    if (!companyId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    const widgetConfig = await db.widgetConfig.findUnique({
      where: { companyId },
    });

    if (!widgetConfig || !widgetConfig.enabled) {
      return NextResponse.json(
        { error: 'Widget not enabled' },
        { status: 403, headers: corsHeaders }
      );
    }

    if (widgetConfig.requireEmail && !email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    const origin = req.headers.get('origin');
    if (
      widgetConfig.allowedDomains.length > 0 &&
      origin &&
      !widgetConfig.allowedDomains.some((domain) => origin.includes(domain))
    ) {
      return NextResponse.json(
        { error: 'Domain not allowed' },
        { status: 403, headers: corsHeaders }
      );
    }

    const psid = sessionId || `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    let conversation = await db.conversation.findFirst({
      where: {
        widgetConfigId: widgetConfig.id,
        psid,
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
      conversation = await db.conversation.create({
        data: {
          psid,
          platform: 'WIDGET',
          widgetConfigId: widgetConfig.id,
          customerName: name || 'Anonymous',
          customerEmail: email || null,
          status: 'OPEN',
          autoBot: widgetConfig.autoBot, // Use widget's autoBot setting
          messages: {
            create: {
              role: 'USER',
              text: message,
            },
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      console.log(`✅ Created widget conversation ${conversation.id}, autoBot: ${widgetConfig.autoBot} (from widget setting)`);

      // Emit events for new conversation
      try {
        // Emit message:new event so ConversationView gets it
        const firstMessage = conversation.messages[0];
        const messageEvent = {
          message: {
            id: firstMessage.id,
            text: firstMessage.text,
            role: firstMessage.role,
            createdAt: firstMessage.createdAt.toISOString(),
            meta: firstMessage.meta,
          },
          conversation: {
            id: conversation.id,
            psid: conversation.psid,
            status: conversation.status,
            autoBot: conversation.autoBot,
            platform: 'WIDGET',
          },
        };

        socketService.emitToConversation(conversation.id, 'message:new', messageEvent);
        socketService.emitToCompany(widgetConfig.companyId, 'message:new', messageEvent);

        // Emit conversation:view-update so ConversationsList adds it to the list
        socketService.emitToCompany(
          widgetConfig.companyId,
          'conversation:view-update',
          {
            conversationId: conversation.id,
            type: 'new_conversation',
            message: {
              text: firstMessage.text,
              role: firstMessage.role,
              createdAt: firstMessage.createdAt.toISOString(),
            },
            lastMessageAt: conversation.lastMessageAt.toISOString(),
            timestamp: new Date().toISOString(),
            // Add full conversation data so it can be added to list
            conversation: {
              id: conversation.id,
              psid: conversation.psid,
              platform: conversation.platform,
              status: conversation.status,
              autoBot: conversation.autoBot,
              customerName: conversation.customerName,
              customerEmail: conversation.customerEmail,
              pageName: widgetConfig.widgetName,
              lastMessageAt: conversation.lastMessageAt.toISOString(),
              messageCount: 1,
              unreadCount: 1,
              lastMessage: {
                text: firstMessage.text,
                role: firstMessage.role,
                createdAt: firstMessage.createdAt.toISOString(),
              },
            },
          }
        );

        // Also emit conversation:updated for statistics
        socketService.emitToCompany(
          widgetConfig.companyId,
          'conversation:updated',
          {
            conversationId: conversation.id,
            updates: {
              lastMessageAt: conversation.lastMessageAt.toISOString(),
              messageCount: 1,
              unreadCount: 1,
            },
          }
        );

        console.log(`✅ Emitted new conversation events for widget conversation ${conversation.id} to company ${widgetConfig.companyId}`);
      } catch (socketError) {
        console.error('Failed to emit new conversation events:', socketError);
      }
    } else {
      const newMessage = await db.message.create({
        data: {
          conversationId: conversation.id,
          role: 'USER',
          text: message,
        },
      });

      conversation = await db.conversation.findUnique({
        where: { id: conversation.id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      // Emit message event for existing conversation
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
            id: conversation!.id,
            psid: conversation!.psid,
            status: conversation!.status,
            autoBot: conversation!.autoBot,
            platform: 'WIDGET',
          },
        };

        socketService.emitToConversation(conversation!.id, 'message:new', messageEvent);
        socketService.emitToCompany(widgetConfig.companyId, 'message:new', messageEvent);

        socketService.emitToCompany(
          widgetConfig.companyId,
          'conversation:view-update',
          {
            conversationId: conversation!.id,
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

        console.log(`✅ Emitted message events for existing widget conversation ${conversation!.id}`);
      } catch (socketError) {
        console.error('Failed to emit message events:', socketError);
      }
    }

    await db.conversation.update({
      where: { id: conversation!.id },
      data: { lastMessageAt: new Date() },
    });

    // Trigger auto-bot response if enabled (in background, don't wait)
    if (conversation!.autoBot) {
      console.log(`🤖 Auto-bot enabled for widget conversation ${conversation!.id}, triggering response...`);
      
      // Process auto-bot in background (don't block the response)
      setImmediate(async () => {
        try {
          // Emit bot typing indicator
          socketService.emitToConversation(
            conversation!.id,
            'bot:typing',
            { conversationId: conversation!.id }
          );
          console.log(`⌨️  Bot typing indicator sent to conversation ${conversation!.id}`);

          // Import RAGChatbot dynamically
          const { RAGChatbot } = await import('@/lib/rag-chatbot');
          
          // Get provider config
          const providerConfig = await db.providerConfig.findUnique({
            where: { companyId: widgetConfig.companyId },
          });

          // Generate bot response
          const botResponse = await RAGChatbot.generateResponse(
            message,
            widgetConfig.companyId,
            conversation!.id,
            {
              similarityThreshold: 0.1,
              searchLimit: 5,
              temperature: providerConfig?.temperature || 0.7,
              maxTokens: providerConfig?.maxTokens || 1000,
              systemPrompt: providerConfig?.systemPrompt,
              providerConfig: providerConfig,
            }
          );

          // Log token usage for Widget init auto-bot responses
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
                    conversationId: conversation!.id,
                    message: message.substring(0, 100),
                    platform: "widget",
                    source: "widget_init",
                    isAutoBot: true,
                  },
                },
              });
              console.log(`✅ Logged ${botResponse.usage.totalTokens} tokens (${botResponse.usage.promptTokens} prompt + ${botResponse.usage.completionTokens} completion) for Widget init auto-bot`);
            } catch (logError) {
              console.error('⚠️ Failed to log token usage:', logError);
              // Don't fail the message if logging fails
            }
          }

          if (botResponse.response) {
            // Save bot message
            const botMessage = await db.message.create({
              data: {
                conversationId: conversation!.id,
                text: botResponse.response,
                role: 'BOT',
                providerUsed: providerConfig?.provider,
                meta: JSON.parse(JSON.stringify({
                  ragContext: botResponse.context,
                  ragUsage: botResponse.usage,
                })),
              },
            });

            console.log(`✅ Bot response generated for widget init: ${botMessage.text.substring(0, 100)}...`);

            // Emit bot message
            const botMessageEvent = {
              message: {
                id: botMessage.id,
                text: botMessage.text,
                role: botMessage.role,
                createdAt: botMessage.createdAt.toISOString(),
                meta: botMessage.meta,
              },
              conversation: {
                id: conversation!.id,
                psid: conversation!.psid,
                status: conversation!.status,
                autoBot: conversation!.autoBot,
                platform: 'WIDGET',
              },
            };

            socketService.emitToConversation(conversation!.id, 'message:new', botMessageEvent);
            socketService.emitToCompany(widgetConfig.companyId, 'message:new', botMessageEvent);

            // Stop typing indicator
            socketService.emitToConversation(
              conversation!.id,
              'bot:stopped-typing',
              { conversationId: conversation!.id }
            );

            console.log(`✅ Widget bot message events emitted`);
          }
        } catch (botError) {
          console.error('Widget auto-bot error:', botError);
          // Stop typing indicator on error
          socketService.emitToConversation(
            conversation!.id,
            'bot:stopped-typing',
            { conversationId: conversation!.id }
          );
        }
      });
    } else {
      console.log(`ℹ️  Auto-bot disabled for widget conversation ${conversation!.id}`);
    }

    return NextResponse.json({
      success: true,
      sessionId: psid,
      conversationId: conversation!.id,
      messages: conversation!.messages,
      config: {
        primaryColor: widgetConfig.primaryColor,
        accentColor: widgetConfig.accentColor,
        welcomeMessage: widgetConfig.welcomeMessage,
        placeholderText: widgetConfig.placeholderText,
        widgetName: widgetConfig.widgetName,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Widget init error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

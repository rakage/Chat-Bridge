import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TelegramUpdate, TelegramMessage, TelegramBot } from "@/lib/telegram-bot";
import { Platform } from "@prisma/client";
import { socketService } from "@/lib/socket";
import { RAGChatbot } from "@/lib/rag-chatbot";
import { decrypt } from "@/lib/encryption";

// Telegram webhook handler (POST)
// NOTE: No rate limiting on webhooks - they come from Telegram's servers, not users
// Telegram uses secret tokens in webhook URLs for security instead
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const update: TelegramUpdate = JSON.parse(body);

    console.log("📨 Telegram webhook received:", JSON.stringify(update, null, 2));

    // Extract message from update
    const message = update.message || update.edited_message;

    if (!message) {
      console.log("⚠️ No message in update, ignoring");
      return NextResponse.json({ ok: true });
    }

    // Process the message
    await handleTelegramMessage(message);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("❌ Error processing Telegram webhook:", error);
    // Always return 200 to Telegram to avoid retries
    return NextResponse.json({ ok: true });
  }
}

async function handleTelegramMessage(message: TelegramMessage) {
  try {
    const chatId = message.chat.id.toString();
    const userId = message.from?.id.toString() || chatId;
    const text = message.text || "";

    console.log(`📨 Processing Telegram message from chat ${chatId}`);

    // Find which bot received this message (we need to check all active bots)
    // Note: In Telegram, we can't determine which bot from the webhook alone
    // We'll need to match based on the webhook URL or use bot-specific webhook paths
    // For now, we'll get the first active Telegram connection
    // In production, you should use separate webhook URLs per bot
    const telegramConnections = await db.telegramConnection.findMany({
      where: {
        isActive: true,
        webhookSet: true,
      },
      include: {
        company: true,
      },
    });

    if (telegramConnections.length === 0) {
      console.warn("⚠️ No active Telegram connections found");
      return;
    }

    // Use the first active connection (in production, match by webhook URL)
    const connection = telegramConnections[0];

    console.log(`📱 Using bot: @${connection.botUsername} for company ${connection.companyId}`);

    // Find or create conversation
    let conversation = await db.conversation.findUnique({
      where: {
        telegramConnectionId_psid: {
          telegramConnectionId: connection.id,
          psid: chatId,
        },
      },
    });

    if (!conversation) {
      console.log(`📝 Creating new Telegram conversation for chat ${chatId}`);

      // Get customer info from message
      const customerName = message.from
        ? `${message.from.first_name}${message.from.last_name ? " " + message.from.last_name : ""}`
        : message.chat.first_name || "Unknown";

      conversation = await db.conversation.create({
        data: {
          psid: chatId,
          platform: Platform.TELEGRAM,
          telegramConnectionId: connection.id,
          status: "OPEN",
          autoBot: connection.autoBot, // Use bot's autoBot setting
          customerName: customerName,
          lastMessageAt: new Date(),
          meta: {
            telegramUserId: userId,
            username: message.from?.username || message.chat.username,
            chatType: message.chat.type,
            platform: "telegram",
          },
        },
      });

      console.log(`✅ Created conversation ${conversation.id}, autoBot: ${connection.autoBot} (from bot setting)`);

      // Emit new conversation event to company room
      try {
        const newConversation: any = {
          id: conversation.id,
          psid: conversation.psid,
          platform: "TELEGRAM",
          status: conversation.status,
          autoBot: conversation.autoBot,
          customerName: customerName,
          lastMessageAt: conversation.lastMessageAt.toISOString(),
          messageCount: 0,
          unreadCount: 1,
          pageName: `@${connection.botUsername}`,
        };

        // Emit as conversation:view-update with new_conversation type for real-time list updates
        socketService.emitToCompany(
          connection.companyId,
          "conversation:view-update",
          {
            conversationId: conversation.id,
            type: "new_conversation",
            conversation: newConversation,
            lastMessageAt: conversation.lastMessageAt.toISOString(),
            timestamp: new Date().toISOString(),
          }
        );

        // Also emit conversation:new for backward compatibility
        socketService.emitToCompany(
          connection.companyId,
          "conversation:new",
          {
            conversation: newConversation,
          }
        );

        console.log(
          `Emitted conversation:new and conversation:view-update events for conversation ${conversation.id} to company ${connection.companyId}`
        );
      } catch (emitError) {
        console.error("Failed to emit conversation events:", emitError);
      }
    } else {
      // Update last message time and customer info (in case name/username changed)
      const customerName = message.from
        ? `${message.from.first_name}${message.from.last_name ? " " + message.from.last_name : ""}`
        : message.chat.first_name || "Unknown";

      await db.conversation.update({
        where: { id: conversation.id },
        data: { 
          lastMessageAt: new Date(),
          customerName: customerName, // Update customer name in case it changed or was missing
          meta: {
            ...(conversation.meta as any),
            telegramUserId: userId,
            username: message.from?.username || message.chat.username,
            chatType: message.chat.type,
          },
        },
      });
    }

    // Save user message
    const userMessage = await db.message.create({
      data: {
        conversationId: conversation.id,
        role: "USER",
        text: text || "(media message)",
        meta: {
          telegramMessageId: message.message_id,
          date: message.date,
          photo: message.photo ? true : false,
          document: message.document ? true : false,
          timestamp: Date.now(),
          source: "telegram_webhook",
          platform: "telegram",
        },
      },
    });

    console.log(`✅ Saved user message ${userMessage.id}`);

    // Emit real-time event for user message
    try {
      const messageEvent = {
        message: {
          id: userMessage.id,
          text: userMessage.text,
          role: userMessage.role,
          createdAt: userMessage.createdAt.toISOString(),
          meta: userMessage.meta,
        },
        conversation: {
          id: conversation.id,
          psid: conversation.psid,
          status: conversation.status,
          autoBot: conversation.autoBot,
          platform: "TELEGRAM",
        },
      };

      console.log(`Emitting message:new to conversation:${conversation.id}`, messageEvent);
      
      socketService.emitToConversation(conversation.id, "message:new", messageEvent);
      socketService.emitToCompany(connection.companyId, "message:new", messageEvent);

      // Emit conversation:view-update for real-time UI updates
      socketService.emitToCompany(
        connection.companyId,
        "conversation:view-update",
        {
          conversationId: conversation.id,
          type: "new_message",
          message: {
            text: userMessage.text,
            role: userMessage.role,
            createdAt: userMessage.createdAt.toISOString(),
          },
          lastMessageAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        }
      );
    } catch (socketError) {
      console.error("Failed to emit real-time events:", socketError);
      // Don't throw - continue processing even if real-time fails
    }

    // If autoBot is enabled, generate and send bot response
    if (conversation.autoBot) {
      console.log(`Auto-bot enabled for conversation ${conversation.id}`);
      try {
        // Generate bot response using RAG (same as Facebook/Instagram)
        const botResponse = await RAGChatbot.generateResponse(
          text,
          connection.companyId,
          conversation.id
        );

        if (botResponse.response) {
          // Save bot response to database
          const botMessage = await db.message.create({
            data: {
              conversationId: conversation.id,
              text: botResponse.response,
              role: "BOT",
              meta: {
                ragContext: JSON.parse(JSON.stringify(botResponse.context)),
                ragUsage: botResponse.usage,
                ragMemory: JSON.parse(JSON.stringify(botResponse.memory)),
                timestamp: Date.now(),
                source: "auto_bot",
                platform: "telegram",
              },
            },
          });

          console.log(`Bot message saved with ID: ${botMessage.id}`);

          // Send bot response via Telegram API
          const botToken = await decrypt(connection.botTokenEnc);
          const telegramBot = new TelegramBot(botToken);
          await telegramBot.sendMessage(chatId, botResponse.response);

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
              platform: "TELEGRAM",
            },
          };

          socketService.emitToConversation(
            conversation.id,
            "message:new",
            botMessageEvent
          );

          // Emit to company room
          socketService.emitToCompany(
            connection.companyId,
            "message:new",
            botMessageEvent
          );

          // Emit conversation:view-update for real-time UI updates
          socketService.emitToCompany(
            connection.companyId,
            "conversation:view-update",
            {
              conversationId: conversation.id,
              type: "new_message",
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

          console.log(`Bot response sent and emitted`);
        }
      } catch (botError) {
        console.error("Auto-bot response failed:", botError);
      }
    }

  } catch (error) {
    console.error("❌ Error handling Telegram message:", error);
    throw error;
  }
}

// Health check endpoint (GET)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: "ok",
    message: "Telegram webhook endpoint is active",
    timestamp: new Date().toISOString(),
  });
}

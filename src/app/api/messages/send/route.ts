import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { socketService } from "@/lib/socket";
import { getOutgoingMessageQueue } from "@/lib/queue";
import { uploadMessageAttachmentToR2 } from "@/lib/r2";
import { invalidateDashboardStatsCache } from "@/lib/cache-invalidation";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ============================================
    // RATE LIMITING: API_MESSAGE_SEND
    // Max 60 messages per minute, block for 30 minutes
    // User-based rate limiting for accuracy
    // ============================================
    const rateLimitResult = await withRateLimit(
      request,
      "API_MESSAGE_SEND",
      session.user.id
    );
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }

    // Check if this is a multipart/form-data request (with file) or JSON (text only)
    const contentType = request.headers.get("content-type") || "";
    let conversationId: string;
    let text: string;
    let imageUrl: string | null = null;
    let imageMetadata: any = null;

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await request.formData();
      conversationId = formData.get("conversationId") as string;
      text = (formData.get("text") as string) || "";
      const file = formData.get("image") as File | null;

      if (file) {
        // Get conversation platform for validation (need to fetch early)
        const tempConversation = await db.conversation.findUnique({
          where: { id: conversationId },
          select: { platform: true }
        });

        const isInstagram = tempConversation?.platform === "INSTAGRAM";

        // Instagram-specific validation: no WebP, max 8MB
        // Per Instagram API: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/send-messages
        const allowedTypes = isInstagram
          ? ["image/jpeg", "image/jpg", "image/png", "image/gif"]
          : ALLOWED_IMAGE_TYPES;

        if (!allowedTypes.includes(file.type)) {
          if (isInstagram && file.type === "image/webp") {
            return NextResponse.json(
              { error: "Instagram doesn't support WebP images. Please use JPEG, PNG, or GIF format." },
              { status: 400 }
            );
          }
          return NextResponse.json(
            { error: `Invalid file type. Only ${isInstagram ? "JPEG, PNG, and GIF" : "JPEG, PNG, WebP, and GIF"} images are allowed.` },
            { status: 400 }
          );
        }

        // Instagram has 8MB limit, others 10MB
        const maxSize = isInstagram ? 8 * 1024 * 1024 : MAX_FILE_SIZE;
        if (file.size > maxSize) {
          return NextResponse.json(
            { error: `File too large. Maximum size is ${isInstagram ? "8MB for Instagram" : "10MB"}.` },
            { status: 400 }
          );
        }

        // Convert file to buffer and upload to R2
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { url, key } = await uploadMessageAttachmentToR2(
          buffer,
          file.name,
          conversationId,
          session.user.id,
          file.type
        );

        imageUrl = url;
        imageMetadata = {
          url,
          key,
          filename: file.name,
          fileSize: file.size,
          contentType: file.type,
        };
      }
    } else {
      // Handle JSON request (text only)
      const body = await request.json();
      conversationId = body.conversationId;
      text = body.text;
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: "Conversation ID is required" },
        { status: 400 }
      );
    }

    if (!text?.trim() && !imageUrl) {
      return NextResponse.json(
        { error: "Message text or image is required" },
        { status: 400 }
      );
    }

    // Get conversation and verify access - DO NOT CREATE if not found
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        pageConnection: {
          include: {
            company: true,
          },
        },
        instagramConnection: {
          include: {
            company: true,
          },
        },
        telegramConnection: {
          include: {
            company: true,
          },
        },
        widgetConfig: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this conversation's company
    const company = conversation.pageConnection?.company || conversation.instagramConnection?.company || conversation.telegramConnection?.company || conversation.widgetConfig?.company;
    if (!company) {
      return NextResponse.json({ error: "Conversation has no associated company" }, { status: 400 });
    }

    if (session.user.companyId !== company.id && session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get agent's photo URL
    const agent = await db.user.findUnique({
      where: { id: session.user.id },
      select: { photoUrl: true },
    });

    // Create agent message
    const message = await db.message.create({
      data: {
        conversationId,
        role: "AGENT",
        text: text?.trim() || "",
        meta: {
          agentId: session.user.id,
          agentName: session.user.name,
          agentPhoto: agent?.photoUrl || null,
          sentAt: new Date().toISOString(),
          ...(imageMetadata && { image: imageMetadata }),
        },
      },
    });

    // Update conversation last message time
    await db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        assigneeId: session.user.id, // Assign conversation to the agent who sent the message
      },
    });

    // Emit real-time events to other users
    try {
      const messageCount = await db.message.count({
        where: { conversationId: conversation.id },
      });

      // Emit conversation:updated for statistics
      socketService.emitToCompany(
        company.id,
        "conversation:updated",
        {
          conversationId: conversation.id,
          lastMessageAt: new Date(),
          messageCount: messageCount,
        }
      );

      // Emit conversation:view-update for real-time UI updates (for ConversationsList)
      socketService.emitToCompany(
        company.id,
        "conversation:view-update",
        {
          conversationId: conversation.id,
          type: "message_sent",
          message: {
            text: message.text,
            role: message.role,
            createdAt: message.createdAt.toISOString(),
          },
          lastMessageAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        }
      );

      // Emit message:new for conversation list updates with message preview
      const messageEvent = {
        message: {
          id: message.id,
          text: message.text,
          role: message.role,
          createdAt: message.createdAt.toISOString(),
          meta: message.meta,
        },
        conversation: {
          id: conversation.id,
          psid: conversation.psid,
          status: conversation.status,
          autoBot: conversation.autoBot,
        },
      };

      socketService.emitToCompany(
        company.id,
        "message:new",
        messageEvent
      );

      // Emit to conversation room for active viewers
      socketService.emitToConversation(
        conversationId,
        "message:new",
        messageEvent
      );

      console.log(
        `📢 Emitted message events to company ${company.id} for agent message`
      );
    } catch (socketError) {
      console.error("Failed to emit real-time events:", socketError);
      // Don't fail the request if real-time fails
    }

    // Queue outgoing message to Facebook, Instagram, Telegram, or Widget
    try {
      // For WIDGET platform, we don't need to send via external API
      // Messages are already stored and will be sent via Socket.io
      if (conversation.platform === 'WIDGET') {
        console.log(
          `💬 Widget message sent to conversation ${conversation.id}, broadcasting via Socket.io`
        );
        return NextResponse.json({
          message: {
            id: message.id,
            text: message.text,
            role: message.role,
            createdAt: message.createdAt,
            meta: message.meta,
          },
        });
      }

      // For TELEGRAM platform, send directly via Telegram Bot API
      if (conversation.platform === 'TELEGRAM') {
        console.log(
          `📱 Sending Telegram message to conversation ${conversation.id}`
        );
        
        if (!conversation.telegramConnection) {
          throw new Error('Telegram connection not found');
        }

        const { decrypt } = await import("@/lib/encryption");
        const { TelegramBot } = await import("@/lib/telegram-bot");
        
        const botToken = await decrypt(conversation.telegramConnection.botTokenEnc);
        const telegramBot = new TelegramBot(botToken);
        
        let result;
        if (imageUrl) {
          // Send photo with caption
          result = await telegramBot.sendPhoto(conversation.psid, imageUrl, text?.trim() || "");
        } else {
          // Send text only
          result = await telegramBot.sendMessage(conversation.psid, text.trim());
        }
        
        if (result.ok && result.result) {
          console.log(`✅ Telegram message sent: ${result.result.message_id}`);
          
          // Update message metadata
          await db.message.update({
            where: { id: message.id },
            data: {
              meta: {
                ...(message.meta && typeof message.meta === 'object' ? message.meta : {}),
                telegramMessageId: result.result.message_id,
                sentAt: new Date().toISOString(),
                sent: true,
              },
            },
          });
        } else {
          console.error(`❌ Telegram send failed:`, result.description);
        }
        
        return NextResponse.json({
          message: {
            id: message.id,
            text: message.text,
            role: message.role,
            createdAt: message.createdAt,
            meta: message.meta,
          },
        });
      }

      const outgoingQueue = await getOutgoingMessageQueue();
      
      // Determine platform and queue accordingly
      const isInstagram = conversation.platform === 'INSTAGRAM';
      
      if (isInstagram) {
        await outgoingQueue.add("send-message", {
          pageId: conversation.instagramConnection?.instagramUserId || '',
          recipientId: conversation.psid,
          messageText: text?.trim() || '',
          messageId: message.id,
          imageUrl: imageUrl || null,
        });
        console.log(
          `📤 Queued outgoing message to Instagram conversation ${conversation.id}${imageUrl ? ' (with image)' : ''}`
        );
      } else {
        await outgoingQueue.add("send-message", {
          pageId: conversation.pageConnection?.pageId || '',
          recipientId: conversation.psid,
          messageText: text?.trim() || '',
          messageId: message.id,
          imageUrl: imageUrl || null,
        });
        console.log(
          `📤 Queued outgoing message to Facebook page ${conversation.pageConnection?.pageId}${imageUrl ? ' (with image)' : ''}`
        );
      }
    } catch (queueError) {
      console.error("Failed to queue outgoing message:", queueError);
      
      // Fallback: Direct API call for development when Redis is unavailable
      try {
        const isInstagram = conversation.platform === 'INSTAGRAM';
        
        if (isInstagram && conversation.instagramConnection) {
          console.log(`🚪 Direct Instagram fallback for conversation ${conversation.id}`);
          
          const { decrypt } = await import("@/lib/encryption");
          const accessToken = await decrypt(conversation.instagramConnection.accessTokenEnc);
          const instagramUserId = conversation.instagramConnection.instagramUserId;
          
          console.log(`🚀 Direct Instagram API call using Instagram Graph API`);
          
          // Build message payload
          const messagePayload: any = { recipient: { id: conversation.psid } };
          if (imageUrl) {
            messagePayload.message = {
              attachment: {
                type: 'image',
                payload: { url: imageUrl, is_reusable: true }
              }
            };
          } else {
            messagePayload.message = { text: text.trim() };
          }
          
          const igResponse = await fetch(`https://graph.instagram.com/v22.0/me/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(messagePayload),
          });
          
          if (igResponse.ok) {
            const igResult = await igResponse.json();
            console.log(`✅ Direct Instagram message sent: ${igResult.message_id}`);
            
            // Update message metadata
            await db.message.update({
              where: { id: message.id },
              data: {
                meta: {
                  ...(message.meta && typeof message.meta === 'object' ? message.meta : {}),
                  instagramMessageId: igResult.message_id,
                  sentAt: new Date().toISOString(),
                  sent: true,
                  sentVia: 'direct-api-fallback'
                },
              },
            });
          } else {
            const errorText = await igResponse.text();
            console.error(`❌ Direct Instagram API error:`, errorText);
          }
        } else if (!isInstagram && conversation.pageConnection) {
          console.log(`🚪 Direct Facebook fallback for conversation ${conversation.id}`);
          
          const { decrypt } = await import("@/lib/encryption");
          const accessToken = await decrypt(conversation.pageConnection.pageAccessTokenEnc);
          const pageId = conversation.pageConnection.pageId;
          
          // Build message payload
          const messagePayload: any = { recipient: { id: conversation.psid } };
          if (imageUrl) {
            messagePayload.message = {
              attachment: {
                type: 'image',
                payload: { url: imageUrl, is_reusable: true }
              }
            };
          } else {
            messagePayload.message = { text: text.trim() };
          }
          
          const fbResponse = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messagePayload),
          });
          
          if (fbResponse.ok) {
            const fbResult = await fbResponse.json();
            console.log(`✅ Direct Facebook message sent: ${fbResult.message_id}`);
            
            // Update message metadata
            await db.message.update({
              where: { id: message.id },
              data: {
                meta: {
                  ...(message.meta && typeof message.meta === 'object' ? message.meta : {}),
                  facebookMessageId: fbResult.message_id,
                  sentAt: new Date().toISOString(),
                  sent: true,
                  sentVia: 'direct-api-fallback'
                },
              },
            });
          } else {
            const errorText = await fbResponse.text();
            console.error(`❌ Direct Facebook API error:`, errorText);
          }
        }
      } catch (fallbackError) {
        console.error("Direct API fallback also failed:", fallbackError);
      }
    }

    // ============================================
    // Invalidate dashboard stats cache
    // Stats will be recalculated on next request
    // ============================================
    try {
      await invalidateDashboardStatsCache(company.id);
    } catch (cacheError) {
      console.error("Cache invalidation error:", cacheError);
      // Don't fail the request if cache invalidation fails
    }

    return createRateLimitResponse(
      {
        message: {
          id: message.id,
          text: message.text,
          role: message.role,
          createdAt: message.createdAt,
          meta: message.meta,
        },
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}

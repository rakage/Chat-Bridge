import { NextRequest, NextResponse } from "next/server";
import { facebookAPI } from "@/lib/facebook";
import { db } from "@/lib/db";
import {
  getIncomingMessageQueue,
  processIncomingMessageDirect,
} from "@/lib/queue";
import { decrypt } from "@/lib/encryption";

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("Webhook verification attempt:", {
    mode,
    token: token ? "***" : null,
    challenge,
  });

  if (!mode || !token || !challenge) {
    console.error("Missing required parameters:", {
      mode,
      token: !!token,
      challenge: !!challenge,
    });
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (mode === "subscribe") {
    try {
      // Check if token matches any page's verify token in database
      const pageConnections = await db.pageConnection.findMany({
        select: {
          pageId: true,
          pageName: true,
          verifyTokenEnc: true,
        },
      });

      let isValidToken = false;
      let matchedPage = null;

      for (const page of pageConnections) {
        try {
          const decryptedVerifyToken = await decrypt(page.verifyTokenEnc);
          if (token === decryptedVerifyToken) {
            isValidToken = true;
            matchedPage = page;
            break;
          }
        } catch (decryptError) {
          console.error(
            `Error decrypting verify token for page ${page.pageId}:`,
            decryptError
          );
          continue;
        }
      }

      // Also check environment variable as fallback
      const envVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
      console.log("🔍 Checking environment verify token:", {
        hasEnvToken: !!envVerifyToken,
        tokenMatches: envVerifyToken === token,
      });

      if (!isValidToken && envVerifyToken && token === envVerifyToken) {
        isValidToken = true;
        matchedPage = { pageName: "Environment Token" };
        console.log("✅ Environment token verified successfully");
      }

      if (isValidToken) {
        console.log(
          "Webhook verified successfully for:",
          matchedPage?.pageName || "Unknown"
        );
        return new NextResponse(challenge, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      } else {
        console.error("❌ Invalid verify token received:", token);
        console.error(
          "📝 Available tokens in database:",
          pageConnections.length
        );
        console.error(
          "🔧 Environment token available:",
          !!process.env.WEBHOOK_VERIFY_TOKEN
        );
        return NextResponse.json(
          { error: "Invalid verify token" },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error("Error during webhook verification:", error);
      return NextResponse.json(
        { error: "Server error during verification" },
        { status: 500 }
      );
    }
  }

  console.error("Invalid webhook mode:", mode);
  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}

// Webhook events (POST)
// NOTE: No rate limiting on webhooks - they come from Facebook's servers, not users
// Signature verification provides protection against unauthorized requests
export async function POST(request: NextRequest) {
  try {
    const signature =
      request.headers.get("x-hub-signature-256") ||
      request.headers.get("x-hub-signature") ||
      "";
    const body = await request.text();

    console.log("📨 Webhook POST received:");
    console.log("📨 Signature header:", signature ? "present" : "missing");
    console.log("📨 Body length:", body.length);

    // Enhanced signature verification with proper security
    const skipSignatureVerification =
      process.env.NODE_ENV === "development" ||
      process.env.SKIP_WEBHOOK_SIGNATURE === "true";

    if (!skipSignatureVerification) {
      // Verify signature using enhanced FacebookAPI method
      if (!signature) {
        console.error("❌ Missing webhook signature");
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 403 }
        );
      }

      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (!appSecret) {
        console.warn(
          "⚠️ FACEBOOK_APP_SECRET not set, skipping signature verification"
        );
      } else {
        console.log("🔐 Verifying webhook signature...");
        try {
          // Try SHA256 first (recommended), then fallback to SHA1 (legacy)
          let isValidSignature = false;
          
          if (signature.startsWith('sha256=')) {
            isValidSignature = facebookAPI.verifyWebhookSignatureSHA256(body, signature);
            console.log("🔐 Using SHA256 signature verification");
          } else {
            isValidSignature = facebookAPI.verifyWebhookSignature(body, signature);
            console.log("🔐 Using legacy SHA1 signature verification");
          }

          if (!isValidSignature) {
            console.error("❌ Invalid webhook signature");
            console.error("❌ Received signature:", signature);
            return NextResponse.json(
              { error: "Invalid signature" },
              { status: 403 }
            );
          }
          console.log("✅ Webhook signature verified successfully");
        } catch (sigError) {
          console.error("❌ Signature verification error:", sigError);
          return NextResponse.json(
            { error: "Signature verification failed" },
            { status: 403 }
          );
        }
      }
    } else {
      console.log("⚠️ Skipping signature verification (development mode)");
    }

    const payload = JSON.parse(body);
    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

    // Parse webhook entries
    const entries = facebookAPI.parseWebhookPayload(payload);

    for (const entry of entries) {
      const pageId = entry.id;

      // Check if page is connected
      const pageConnection = await db.pageConnection.findUnique({
        where: { pageId },
        include: {
          company: true,
        },
      });

      if (!pageConnection) {
        console.log(`Page ${pageId} not connected, ignoring webhook`);
        continue;
      }

      // Process messaging events with comprehensive event handling
      for (const messagingEvent of entry.messaging) {
        try {
          console.log(`📨 Processing event for page ${pageId}:`, 
                      JSON.stringify(messagingEvent, null, 2));

          if (facebookAPI.isMessageEvent(messagingEvent)) {
            // Handle different types of messages
            const senderId = messagingEvent.sender.id;
            const timestamp = messagingEvent.timestamp;
            let messageText = messagingEvent.message?.text || "";
            let eventType = "text_message";
            let payload = null;

            // Check for quick reply
            if (facebookAPI.hasQuickReply(messagingEvent)) {
              payload = facebookAPI.getQuickReplyPayload(messagingEvent);
              eventType = "quick_reply";
              messageText = `Quick Reply: ${messagingEvent.message?.text || payload}`;
              console.log(`🔘 Quick reply from ${senderId}: ${payload}`);
            }
            // Check for attachments
            else if (facebookAPI.hasAttachments(messagingEvent)) {
              const attachmentType = facebookAPI.getAttachmentType(messagingEvent);
              eventType = `attachment_${attachmentType}`;
              messageText = `[${attachmentType?.toUpperCase()} attachment]`;
              console.log(`📎 ${attachmentType} attachment from ${senderId}`);
            }
            // Check for echo messages (sent by the page)
            else if (facebookAPI.isEchoMessage(messagingEvent)) {
              eventType = "message_echo";
              console.log(`📤 Echo message: ${messageText}`);
              // Skip processing echo messages
              continue;
            }

            console.log(`📨 ${eventType} from ${senderId}: ${messageText}`);

            // Queue message for processing (only if Redis is available)
            try {
              const messageQueue = await getIncomingMessageQueue();
              await messageQueue.add("process-message", {
                pageId,
                senderId,
                messageText,
                timestamp,
                eventType,
                payload,
                attachments: messagingEvent.message?.attachments || [],
              });
              console.log(`✅ ${eventType} queued for processing via Redis`);
            } catch (queueError) {
              console.error(
                "Failed to queue message (Redis unavailable):",
                queueError
              );
              // Fallback: Process message directly without Redis
              console.log("🔄 Processing message directly (Redis fallback)");
              try {
                await processIncomingMessageDirect({
                  pageId,
                  senderId,
                  messageText,
                  timestamp,
                });
                console.log(`✅ ${eventType} processed directly without Redis`);
              } catch (directProcessError) {
                console.error(
                  "❌ Direct message processing failed:",
                  directProcessError
                );
                throw directProcessError;
              }
            }
          } else if (facebookAPI.isPostbackEvent(messagingEvent)) {
            // Handle postback events (buttons, get started, persistent menu)
            const senderId = messagingEvent.sender.id;
            const payload = facebookAPI.getPostbackPayload(messagingEvent);
            const title = messagingEvent.postback?.title || "Postback";
            const timestamp = messagingEvent.timestamp;

            console.log(`🔘 Postback from ${senderId}: ${title} (${payload})`);

            try {
              const messageQueue = await getIncomingMessageQueue();
              await messageQueue.add("process-message", {
                pageId,
                senderId,
                messageText: title,
                timestamp,
                eventType: "postback",
                payload,
              });
              console.log(`✅ Postback queued for processing via Redis`);
            } catch (queueError) {
              console.error(
                "Failed to queue postback (Redis unavailable):",
                queueError
              );
              // Process directly as fallback
              try {
                await processIncomingMessageDirect({
                  pageId,
                  senderId,
                  messageText: title,
                  timestamp,
                });
              } catch (directProcessError) {
                console.error(
                  "❌ Direct postback processing failed:",
                  directProcessError
                );
              }
            }
          } else if (facebookAPI.isDeliveryEvent(messagingEvent)) {
            // Handle delivery confirmation
            console.log("Message delivered:", messagingEvent.delivery);

            // Update message delivery status in database
            if (messagingEvent.delivery?.mids) {
              for (const mid of messagingEvent.delivery.mids) {
                await db.message.updateMany({
                  where: {
                    meta: {
                      path: ["facebookMessageId"],
                      equals: mid,
                    },
                  },
                  data: {
                    meta: {
                      ...((messagingEvent as any)?.meta || {}),
                      deliveredAt: new Date(
                        messagingEvent.delivery.watermark
                      ).toISOString(),
                    },
                  },
                });
              }
            }
          } else if (facebookAPI.isReadEvent(messagingEvent)) {
          // Handle read confirmation
          console.log("Message read:", messagingEvent.read);

          // Update conversation read status - find page connection first
          const pageConnection = await db.pageConnection.findUnique({
            where: { pageId },
          });
          
          if (!pageConnection) {
            console.log(`Page ${pageId} not connected for read event`);
            continue;
          }
          
          const conversation = await db.conversation.findUnique({
            where: {
              pageConnectionId_psid: {
                pageConnectionId: pageConnection.id,
                psid: messagingEvent.sender.id,
              },
            },
          });

            if (conversation) {
              await db.conversation.update({
                where: { id: conversation.id },
                data: {
                  meta: {
                    ...(conversation.meta as any),
                    lastReadAt: new Date(
                      messagingEvent.read!.watermark
                    ).toISOString(),
                  },
                },
              });
            }
          } else if (facebookAPI.isAccountLinkingEvent(messagingEvent)) {
            // Handle account linking/unlinking events
            const senderId = messagingEvent.sender.id;
            const status = messagingEvent.account_linking?.status;
            const authCode = messagingEvent.account_linking?.authorization_code;
            
            console.log(`🔗 Account linking event from ${senderId}: ${status}`);
            if (authCode) {
              console.log(`🔑 Authorization code: ${authCode}`);
            }
            
            // Handle account linking logic here
            // You might want to store the linking status in database
          } else if (facebookAPI.isOptinEvent(messagingEvent)) {
            // Handle optin events (checkbox plugin, send-to-messenger plugin)
            const senderId = messagingEvent.sender.id;
            const ref = messagingEvent.optin?.ref;
            const userRef = messagingEvent.optin?.user_ref;
            
            console.log(`📩 Optin event from ${senderId}, ref: ${ref}`);
            if (userRef) {
              console.log(`👤 User ref: ${userRef}`);
            }
            
            // Handle optin logic (e.g., subscribe user to notifications)
          } else if (facebookAPI.isReferralEvent(messagingEvent)) {
            // Handle referral events (m.me links, ads)
            const senderId = messagingEvent.sender.id;
            const ref = messagingEvent.referral?.ref;
            const source = messagingEvent.referral?.source;
            const type = messagingEvent.referral?.type;
            
            console.log(`🔗 Referral event from ${senderId}: ${source} -> ${ref} (${type})`);
            
            // Handle referral logic (e.g., track campaign performance)
          } else if (facebookAPI.isReactionEvent(messagingEvent)) {
            // Handle message reactions
            const senderId = messagingEvent.sender.id;
            const mid = messagingEvent.reaction?.mid;
            const action = messagingEvent.reaction?.action;
            const reaction = messagingEvent.reaction?.reaction || messagingEvent.reaction?.emoji;
            
            console.log(`😍 Reaction ${action} from ${senderId} on message ${mid}: ${reaction}`);
            
            // Update message reaction status in database
            if (mid) {
              try {
                await db.message.updateMany({
                  where: {
                    meta: {
                      path: ["facebookMessageId"],
                      equals: mid,
                    },
                  },
                  data: {
                    meta: {
                      reactions: {
                        [senderId]: {
                          action,
                          reaction,
                          timestamp: messagingEvent.timestamp,
                        },
                      },
                    },
                  },
                });
              } catch (reactionError) {
                console.error("Failed to update reaction:", reactionError);
              }
            }
          } else if (facebookAPI.isMessageEditEvent(messagingEvent)) {
            // Handle message edit events
            const senderId = messagingEvent.sender.id;
            const mid = messagingEvent.message_edit?.mid;
            const newText = messagingEvent.message_edit?.text;
            
            console.log(`✏️ Message edit from ${senderId}: ${mid} -> "${newText}"`);
            
            // Update message content in database
            if (mid && newText) {
              try {
                await db.message.updateMany({
                  where: {
                    meta: {
                      path: ["facebookMessageId"],
                      equals: mid,
                    },
                  },
                  data: {
                    text: newText,
                    meta: {
                      editedAt: new Date(messagingEvent.timestamp).toISOString(),
                      originalContent: "[Content was edited]",
                    },
                  },
                });
              } catch (editError) {
                console.error("Failed to update edited message:", editError);
              }
            }
          } else if (facebookAPI.isPolicyEnforcementEvent(messagingEvent)) {
            // Handle policy enforcement events
            const action = messagingEvent.policy_enforcement?.action;
            const reason = messagingEvent.policy_enforcement?.reason;
            
            console.warn(`⚠️ Policy enforcement: ${action} - ${reason}`);
            
            // Log policy enforcement for review
            // You might want to alert administrators
          } else if (facebookAPI.isHandoverEvent(messagingEvent)) {
            // Handle handover protocol events
            const newOwnerAppId = messagingEvent.handover?.new_owner_app_id;
            const metadata = messagingEvent.handover?.metadata;
            
            console.log(`🔄 Handover to app ${newOwnerAppId}, metadata: ${metadata}`);
            
            // Handle conversation handover logic
          } else {
            // Handle unknown or unsupported events
            console.log("❓ Unknown messaging event type:", 
                        Object.keys(messagingEvent).filter(key => 
                          !['sender', 'recipient', 'timestamp'].includes(key)
                        )
                      );
          }
        } catch (eventError) {
          console.error("Error processing messaging event:", eventError);
          // Continue processing other events even if one fails
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Disable body size limit for webhook
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

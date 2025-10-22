import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import {
  getIncomingMessageQueue,
  processIncomingMessageDirect,
  processInstagramMessageDirect,
  queueService,
} from "@/lib/queue";

// Webhook verification for Instagram
export async function GET(request: NextRequest) {
  try {
    console.log("📥 Instagram webhook verification received");

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("hub.mode");
    const token = searchParams.get("hub.verify_token");
    const challenge = searchParams.get("hub.challenge");

    console.log("🔍 Verification params:", { mode, token: token?.substring(0, 5) + "...", challenge });

    // Use the token from your Instagram webhook configuration
    const expectedToken = "instagram_webhook_token_123";

    // Verify the webhook
    if (mode === "subscribe" && token === expectedToken) {
      console.log("✅ Instagram webhook verified successfully");
      return new NextResponse(challenge, { status: 200 });
    } else {
      console.error("❌ Instagram webhook verification failed");
      console.error("Expected mode: subscribe, got:", mode);
      console.error("Expected token: instagram_webhook_token_123, got:", token);
      return NextResponse.json({ error: "Verification failed" }, { status: 403 });
    }
  } catch (error) {
    console.error("❌ Instagram webhook verification error:", error);
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 500 });
  }
}

// Handle Instagram webhook events
// NOTE: No rate limiting on webhooks - they come from Instagram's servers, not users
// Signature verification provides protection against unauthorized requests
export async function POST(request: NextRequest) {
  try {
    console.log("📥 Instagram webhook event received");

    const body = await request.text();
    const signature = request.headers.get("X-Hub-Signature-256");

    // Skip signature verification in development or when SKIP_WEBHOOK_SIGNATURE is set
    const skipSignatureVerification =
      process.env.NODE_ENV === "development" ||
      process.env.SKIP_WEBHOOK_SIGNATURE === "true";

    if (!skipSignatureVerification) {
      // Verify webhook signature
      if (!signature) {
        console.error("❌ No signature provided");
        return NextResponse.json({ error: "No signature" }, { status: 401 });
      }

      const instagramAppSecret = process.env.INSTAGRAM_APP_SECRET;
      if (!instagramAppSecret) {
        console.warn("⚠️ INSTAGRAM_APP_SECRET not set, skipping signature verification");
      } else {
        const expectedSignature = crypto
          .createHmac("sha256", instagramAppSecret)
          .update(body)
          .digest("hex");

        const signatureHash = signature.replace("sha256=", "");

        if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signatureHash))) {
          console.error("❌ Invalid signature");
          return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
        }
        console.log("✅ Instagram webhook signature verified");
      }
    } else {
      console.log("⚠️ Skipping Instagram signature verification (development mode)");
    }

    const data = JSON.parse(body);
    console.log("📨 Instagram webhook data:", JSON.stringify(data, null, 2));

    // Process Instagram webhook events
    if (data.object === "instagram") {
      for (const entry of data.entry) {
        if (entry.messaging) {
          for (const messagingEvent of entry.messaging) {
            await processInstagramMessage(messagingEvent);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("❌ Instagram webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

async function processInstagramMessage(messagingEvent: any) {
  try {
    console.log("📱 Processing Instagram message event:", messagingEvent);

    const senderId = messagingEvent.sender?.id;
    const recipientId = messagingEvent.recipient?.id; // This is your Instagram Business Account ID
    const message = messagingEvent.message;
    const timestamp = messagingEvent.timestamp;

    if (message && message.text) {
      // IMPORTANT: Ignore echo messages (messages sent by you that Instagram echoes back)
      if (message.is_echo) {
        console.log(`🔄 Ignoring echo message from ${senderId}: "${message.text}" (this was sent by you)`);
        return;
      }
      
      console.log(`💬 New Instagram message from ${senderId}: "${message.text}"`);
      
      // Find the Instagram connection for this recipient (your business account)
      const instagramConnection = await db.instagramConnection.findFirst({
        where: {
          instagramUserId: recipientId,
          isActive: true,
        },
        include: {
          company: true,
        },
      });

    if (!instagramConnection) {
      console.log(`🔍 Instagram account ${recipientId} not found, checking for ID mapping...`);
      
      // Check if there's an Instagram connection with a different ID that might be this account
      // This handles the case where OAuth returns different ID than webhook recipient ID
      const allConnections = await db.instagramConnection.findMany({
        where: {
          isActive: true,
        },
        include: { company: true }
      });
      
      console.log(`📊 Found ${allConnections.length} Instagram connections to check`);
      
      // AUTO-CORRECTION: Update any connection that might be this account
      for (const connection of allConnections) {
        console.log(`🔍 Checking connection: @${connection.username} (stored ID: ${connection.instagramUserId})`);
        
        // Strategy 1: If we only have one Instagram connection, assume this webhook is for it
        if (allConnections.length === 1) {
          console.log(`⚡ AUTO-CORRECTION: Single Instagram account detected`);
          console.log(`   Account: @${connection.username}`);
          console.log(`   Stored ID: ${connection.instagramUserId}`);
          console.log(`   Webhook ID: ${recipientId}`);
          console.log(`   🔄 Updating to use correct webhook ID...`);
          
          // Update the connection to use the correct business account ID from webhook
          const updatedConnection = await db.instagramConnection.update({
            where: { id: connection.id },
            data: { 
              instagramUserId: recipientId, // Use the webhook recipient ID
              updatedAt: new Date()
            }
          });
          
          console.log(`✅ Instagram ID auto-corrected for @${connection.username}`);
          console.log(`   New stored ID: ${recipientId}`);
          console.log(`📱 Future webhooks will be processed correctly`);
          
          // Use the updated connection for processing
          const correctedConnection = {
            ...updatedConnection,
            company: connection.company
          };
          
          // Continue with message processing using corrected connection
          await processMessageWithConnection(messagingEvent, correctedConnection);
          return;
        }
      }
      
      // Strategy 2: For multiple accounts, check if any username/account suggests a match
      // (You could enhance this with more sophisticated matching logic)
      
      console.log(`⚠️ No Instagram connection found for webhook recipient ${recipientId}`);
      console.log(`💡 To fix this:`);
      console.log(`   1. The webhook recipient ID ${recipientId} doesn't match any stored Instagram connection`);
      console.log(`   2. Check which Instagram account sent this message`);
      console.log(`   3. Update that account's stored ID to ${recipientId}`);
      
      return;
    }

      console.log(`🏢 Found Instagram connection for company: ${instagramConnection.company.name}`);
      
      // Process the message
      await processMessageWithConnection(messagingEvent, instagramConnection);
    }

    // Handle other Instagram message types (media, postback, etc.)
    if (messagingEvent.postback) {
      console.log("📝 Instagram postback received:", messagingEvent.postback);
    }

    if (message && message.attachments) {
      console.log("📎 Instagram media attachment received:", message.attachments);
    }

  } catch (error) {
    console.error("❌ Error processing Instagram message:", error);
  }
}

// Helper function to process Instagram message with a given connection
async function processMessageWithConnection(messagingEvent: any, instagramConnection: any) {
  const senderId = messagingEvent.sender?.id;
  const recipientId = messagingEvent.recipient?.id;
  const message = messagingEvent.message;
  const timestamp = messagingEvent.timestamp;
  
  if (!message?.text) return;
  
  console.log(`💬 Processing Instagram message from ${senderId}: "${message.text}"`);
  
  // Process message using queue system
  const messageData = {
    instagramUserId: recipientId,
    senderId: senderId,
    messageText: message.text,
    timestamp: timestamp,
    messageId: message.mid,
    companyId: instagramConnection.companyId,
  };

  try {
    // Try to add to Redis queue first
    if (queueService.isRedisAvailable()) {
      await queueService.addJob("process-instagram-message", messageData);
      console.log(`✅ Instagram message queued for processing via Redis`);
    } else {
      // Process directly if Redis is not available
      console.log("🔄 Processing Instagram message directly (Redis fallback)");
      await processInstagramMessageDirect(messageData);
      console.log(`✅ Instagram message processed directly without Redis`);
    }
  } catch (processingError) {
    console.error(
      "❌ Instagram message processing failed:",
      processingError
    );
    // Don't fail the webhook - log error and continue
  }
}

// Helper function to send Instagram messages
async function sendInstagramMessage(recipientId: string, messageText: string) {
  try {
    // You'll need to get the page access token from your database
    // const pageAccessToken = await getInstagramPageToken(recipientId);
    
    // For now, just log the intent
    console.log(`📤 Would send Instagram message to ${recipientId}: "${messageText}"`);
    
    // Actual implementation would use Instagram messaging API:
    // const response = await fetch(`https://graph.instagram.com/v18.0/me/messages`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //   },
    //   body: JSON.stringify({
    //     recipient: { id: recipientId },
    //     message: { text: messageText },
    //     access_token: pageAccessToken
    //   })
    // });
    
  } catch (error) {
    console.error("❌ Error sending Instagram message:", error);
  }
}

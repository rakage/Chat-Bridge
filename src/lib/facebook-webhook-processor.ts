/**
 * Facebook Webhook Processor with Chatwoot-inspired architecture
 * 
 * Key features:
 * 1. Dynamic token lookup per page (no global tokens)
 * 2. Redis mutex locks to prevent race conditions
 * 3. Proper message routing based on recipient_id
 * 4. Echo message handling with delay
 * 5. Comprehensive error handling
 */

import { facebookAPI } from "./facebook";
import { db } from "./db";
import { decrypt } from "./encryption";
import { getIncomingMessageQueue, processIncomingMessageDirect } from "./queue";
import type { FacebookMessagingEvent, FacebookWebhookEntry } from "./facebook";

interface WebhookProcessingResult {
  success: boolean;
  processedEvents: number;
  errors: string[];
}

export class FacebookWebhookProcessor {
  
  /**
   * Dynamic token lookup - fetches page-specific access token from database
   * This is the Chatwoot pattern: each webhook uses its own page's token
   */
  private static async getPageAccessToken(pageId: string): Promise<string | null> {
    try {
      const pageConnection = await db.pageConnection.findUnique({
        where: { pageId },
        select: { pageAccessTokenEnc: true },
      });

      if (!pageConnection) {
        console.log(`❌ Page ${pageId} not found in database`);
        return null;
      }

      const accessToken = await decrypt(pageConnection.pageAccessTokenEnc);
      console.log(`✅ Retrieved access token for page ${pageId}`);
      return accessToken;
    } catch (error) {
      console.error(`❌ Failed to get access token for page ${pageId}:`, error);
      return null;
    }
  }

  /**
   * Get page connection with company context
   */
  private static async getPageConnection(pageId: string) {
    const pageConnection = await db.pageConnection.findUnique({
      where: { pageId },
      include: {
        company: true,
      },
    });

    if (!pageConnection) {
      console.log(`⚠️ Page ${pageId} not connected to any company`);
      return null;
    }

    return pageConnection;
  }

  /**
   * Acquire Redis lock to prevent duplicate message processing
   * This is critical for handling race conditions (Chatwoot pattern)
   */
  private static async withMutexLock<T>(
    key: string,
    callback: () => Promise<T>
  ): Promise<T> {
    // Try to use Redis if available
    try {
      const redis = (await import("./redis")).default;
      
      const lockKey = `mutex:facebook:${key}`;
      const lockValue = Date.now().toString();
      const lockTimeout = 30; // 30 seconds

      // Try to acquire lock using ioredis syntax
      // SET key value EX seconds NX
      const acquired = await redis.set(lockKey, lockValue, 'EX', lockTimeout, 'NX');

      if (!acquired) {
        console.log(`⏳ Lock already held for ${key}, waiting...`);
        // Wait briefly and try again
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      try {
        return await callback();
      } finally {
        // Release lock only if we still hold it
        const currentValue = await redis.get(lockKey);
        if (currentValue === lockValue) {
          await redis.del(lockKey);
        }
      }
    } catch (redisError) {
      console.warn("⚠️ Redis mutex not available, processing without lock:", redisError);
      // Fallback: Execute without lock
      return await callback();
    }
  }

  /**
   * Process incoming message event
   */
  private static async processMessageEvent(
    pageId: string,
    event: FacebookMessagingEvent
  ): Promise<void> {
    const senderId = event.sender.id;
    const recipientId = event.recipient.id;
    const timestamp = event.timestamp;

    // Use Redis mutex to prevent duplicate processing
    // Lock format: senderId:recipientId ensures per-conversation locking
    const mutexKey = `${senderId}:${recipientId}`;

    await this.withMutexLock(mutexKey, async () => {
      let messageText = event.message?.text || "";
      let eventType = "text_message";
      let payload = null;

      // Check for echo messages (sent BY the page)
      if (facebookAPI.isEchoMessage(event)) {
        console.log(`📤 Echo message detected from page ${pageId}`);
        // Note: Chatwoot delays echo processing by 2 seconds to prevent race conditions
        // In your case, you might want to skip echoes or handle them differently
        return;
      }

      // Check for quick reply
      if (facebookAPI.hasQuickReply(event)) {
        payload = facebookAPI.getQuickReplyPayload(event);
        eventType = "quick_reply";
        messageText = `Quick Reply: ${event.message?.text || payload}`;
        console.log(`🔘 Quick reply from ${senderId}: ${payload}`);
      }
      // Check for attachments
      else if (facebookAPI.hasAttachments(event)) {
        const attachmentType = facebookAPI.getAttachmentType(event);
        eventType = `attachment_${attachmentType}`;
        messageText = `[${attachmentType?.toUpperCase()} attachment]`;
        console.log(`📎 ${attachmentType} attachment from ${senderId}`);
      }

      console.log(`📨 Processing ${eventType} from ${senderId} to page ${pageId}`);

      // Queue message for processing (with Redis if available)
      try {
        const messageQueue = await getIncomingMessageQueue();
        await messageQueue.add("process-message", {
          pageId,
          senderId,
          messageText,
          timestamp,
          eventType,
          payload,
          attachments: event.message?.attachments || [],
        });
        console.log(`✅ ${eventType} queued for processing via Redis`);
      } catch (queueError) {
        console.warn("⚠️ Redis queue unavailable, processing directly:", queueError);
        // Fallback: Process directly
        await processIncomingMessageDirect({
          pageId,
          senderId,
          messageText,
          timestamp,
        });
        console.log(`✅ ${eventType} processed directly`);
      }
    });
  }

  /**
   * Process postback event
   */
  private static async processPostbackEvent(
    pageId: string,
    event: FacebookMessagingEvent
  ): Promise<void> {
    const senderId = event.sender.id;
    const recipientId = event.recipient.id;
    const payload = facebookAPI.getPostbackPayload(event);
    const title = event.postback?.title || "Postback";
    const timestamp = event.timestamp;

    const mutexKey = `${senderId}:${recipientId}`;

    await this.withMutexLock(mutexKey, async () => {
      console.log(`🔘 Postback from ${senderId} to page ${pageId}: ${title} (${payload})`);

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
        console.log(`✅ Postback queued for processing`);
      } catch (queueError) {
        console.warn("⚠️ Redis queue unavailable, processing directly:", queueError);
        await processIncomingMessageDirect({
          pageId,
          senderId,
          messageText: title,
          timestamp,
        });
      }
    });
  }

  /**
   * Process delivery event
   */
  private static async processDeliveryEvent(
    pageId: string,
    event: FacebookMessagingEvent
  ): Promise<void> {
    console.log(`✅ Message delivered on page ${pageId}:`, event.delivery);

    if (event.delivery?.mids) {
      for (const mid of event.delivery.mids) {
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
                deliveredAt: new Date(event.delivery.watermark).toISOString(),
              },
            },
          });
        } catch (updateError) {
          console.error(`Failed to update delivery status for ${mid}:`, updateError);
        }
      }
    }
  }

  /**
   * Process read event
   */
  private static async processReadEvent(
    pageId: string,
    event: FacebookMessagingEvent
  ): Promise<void> {
    console.log(`👁️ Message read on page ${pageId}:`, event.read);

    const pageConnection = await this.getPageConnection(pageId);
    if (!pageConnection) {
      return;
    }

    const conversation = await db.conversation.findFirst({
      where: {
        pageConnectionId: pageConnection.id,
        psid: event.sender.id,
        status: {
          in: ["OPEN", "SNOOZED"],
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
    });

    if (conversation) {
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          meta: {
            ...(conversation.meta as any),
            lastReadAt: new Date(event.read!.watermark).toISOString(),
          },
        },
      });
    }
  }

  /**
   * Main webhook processing method
   * Routes webhooks to correct page based on recipient_id (Chatwoot pattern)
   */
  static async processWebhookEntry(
    entry: FacebookWebhookEntry
  ): Promise<WebhookProcessingResult> {
    const result: WebhookProcessingResult = {
      success: true,
      processedEvents: 0,
      errors: [],
    };

    // CRITICAL: Use entry.id as pageId (this is the page that received the webhook)
    const pageId = entry.id;

    console.log(`\n${"=".repeat(60)}`);
    console.log(`📄 Processing webhook for Page ID: ${pageId}`);
    console.log(`   Time: ${new Date(entry.time).toISOString()}`);
    console.log(`   Events: ${entry.messaging.length}`);
    console.log(`${"=".repeat(60)}\n`);

    // Verify page is connected
    const pageConnection = await this.getPageConnection(pageId);
    if (!pageConnection) {
      const error = `Page ${pageId} not connected, ignoring webhook`;
      console.log(`⚠️ ${error}`);
      result.errors.push(error);
      result.success = false;
      return result;
    }

    console.log(`✅ Page found: ${pageConnection.pageName} (Company: ${pageConnection.company.name})`);

    // Process each messaging event
    for (const event of entry.messaging) {
      try {
        console.log(`\n📨 Event ${result.processedEvents + 1}/${entry.messaging.length}:`);
        console.log(`   From: ${event.sender.id}`);
        console.log(`   To: ${event.recipient.id}`);
        console.log(`   Timestamp: ${new Date(event.timestamp).toISOString()}`);

        // Route to appropriate handler
        if (facebookAPI.isMessageEvent(event)) {
          await this.processMessageEvent(pageId, event);
        } else if (facebookAPI.isPostbackEvent(event)) {
          await this.processPostbackEvent(pageId, event);
        } else if (facebookAPI.isDeliveryEvent(event)) {
          await this.processDeliveryEvent(pageId, event);
        } else if (facebookAPI.isReadEvent(event)) {
          await this.processReadEvent(pageId, event);
        } else {
          console.log("ℹ️ Unhandled event type:", Object.keys(event));
        }

        result.processedEvents++;
      } catch (eventError) {
        const error = `Failed to process event: ${eventError instanceof Error ? eventError.message : String(eventError)}`;
        console.error(`❌ ${error}`);
        result.errors.push(error);
        // Continue processing other events
      }
    }

    console.log(`\n✅ Webhook processing complete for page ${pageId}`);
    console.log(`   Processed: ${result.processedEvents} events`);
    console.log(`   Errors: ${result.errors.length}\n`);

    return result;
  }

  /**
   * Process multiple entries (from same webhook payload)
   */
  static async processWebhookPayload(entries: FacebookWebhookEntry[]): Promise<{
    success: boolean;
    totalProcessed: number;
    totalErrors: number;
    results: WebhookProcessingResult[];
  }> {
    console.log(`\n${"🔔".repeat(30)}`);
    console.log(`📬 Processing webhook payload with ${entries.length} entries`);
    console.log(`${"🔔".repeat(30)}\n`);

    const results: WebhookProcessingResult[] = [];
    let totalProcessed = 0;
    let totalErrors = 0;

    // Process each entry (each entry = one page's events)
    for (const entry of entries) {
      const result = await this.processWebhookEntry(entry);
      results.push(result);
      totalProcessed += result.processedEvents;
      totalErrors += result.errors.length;
    }

    const overallSuccess = results.every(r => r.success) && totalErrors === 0;

    console.log(`\n${"✅".repeat(30)}`);
    console.log(`📊 Webhook Processing Summary:`);
    console.log(`   Entries: ${entries.length}`);
    console.log(`   Events Processed: ${totalProcessed}`);
    console.log(`   Errors: ${totalErrors}`);
    console.log(`   Status: ${overallSuccess ? "✅ SUCCESS" : "⚠️ PARTIAL SUCCESS"}`);
    console.log(`${"✅".repeat(30)}\n`);

    return {
      success: overallSuccess,
      totalProcessed,
      totalErrors,
      results,
    };
  }
}

export default FacebookWebhookProcessor;

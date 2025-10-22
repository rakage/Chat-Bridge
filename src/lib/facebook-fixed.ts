import crypto from "crypto";
import { decrypt } from "./encryption";

export interface FacebookWebhookEntry {
  id: string;
  time: number;
  messaging: FacebookMessagingEvent[];
}

export interface FacebookMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    attachments?: any[];
    is_echo?: boolean;
  };
  delivery?: {
    mids: string[];
    watermark: number;
  };
  read?: {
    watermark: number;
  };
  postback?: {
    title: string;
    payload: string;
  };
}

export interface FacebookSendMessageRequest {
  recipient: { id: string };
  message: {
    text?: string;
    attachment?: any;
  };
  messaging_type?: "RESPONSE" | "UPDATE" | "MESSAGE_TAG";
  tag?: string;
}

export class FacebookAPIFixed {
  private appSecret: string;

  constructor() {
    if (!process.env.FB_APP_SECRET) {
      throw new Error("FB_APP_SECRET environment variable is required");
    }
    this.appSecret = process.env.FB_APP_SECRET;
  }

  /**
   * Verify webhook signature from Facebook
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) {
      return false;
    }

    const elements = signature.split("=");
    const method = elements[0];
    const signatureHash = elements[1];

    if (method !== "sha1") {
      return false;
    }

    const expectedHash = crypto
      .createHmac("sha1", this.appSecret)
      .update(payload, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  }

  /**
   * Verify webhook token for initial setup
   */
  verifyWebhookToken(token: string, verifyToken: string): boolean {
    return crypto.timingSafeEqual(
      Buffer.from(token, "utf8"),
      Buffer.from(verifyToken, "utf8")
    );
  }

  /**
   * Send a message to a user via Facebook Messenger
   */
  async sendMessage(
    pageAccessToken: string,
    request: FacebookSendMessageRequest
  ): Promise<{ message_id: string }> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/messages?access_token=${pageAccessToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Facebook Send API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Get page information including profile picture
   */
  async getPageInfo(pageAccessToken: string): Promise<{
    id: string;
    name: string;
    category: string;
    picture?: {
      data: {
        url: string;
        is_silhouette: boolean;
      };
    };
  }> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,category,picture{url,is_silhouette}&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Facebook Graph API error: ${response.status} - ${error}`
      );
    }

    return await response.json();
  }

  /**
   * FIXED: Subscribe page to webhook events - CORRECT METHOD FOR MULTIPLE PAGES
   */
  async subscribePageToWebhook(
    pageAccessToken: string,
    subscribed_fields: string[] = [
      "messages",
      "messaging_postbacks",
      "message_deliveries",
      "message_reads",
    ]
  ): Promise<{ success: boolean }> {
    console.log(`🔔 FIXED: Subscribing page to webhook with proper method...`);
    
    // STEP 1: First, ensure the app is subscribed to the page
    const subscribeAppResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/subscribed_apps`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscribed_fields: subscribed_fields.join(","),
          access_token: pageAccessToken,
        }),
      }
    );

    if (!subscribeAppResponse.ok) {
      const error = await subscribeAppResponse.text();
      console.error("❌ Failed to subscribe app to page:", error);
      throw new Error(
        `Facebook Webhook app subscription error: ${subscribeAppResponse.status} - ${error}`
      );
    }

    const appSubscriptionResult = await subscribeAppResponse.json();
    console.log("✅ App subscribed to page:", appSubscriptionResult);

    // STEP 2: Verify the subscription worked
    const verifyResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/subscribed_apps?access_token=${pageAccessToken}`
    );

    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json();
      console.log("🔍 Current subscriptions:", verifyData);
      
      if (verifyData.data && verifyData.data.length > 0) {
        const hasSubscription = verifyData.data.some((app: any) => app.id === process.env.FACEBOOK_APP_ID);
        if (hasSubscription) {
          console.log("✅ Webhook subscription verified successfully");
          return { success: true };
        } else {
          console.warn("⚠️ App not found in page subscriptions");
        }
      }
    }

    return appSubscriptionResult;
  }

  /**
   * FIXED: Unsubscribe page from webhook events
   */
  async unsubscribePageFromWebhook(
    pageAccessToken: string
  ): Promise<{ success: boolean }> {
    console.log(`🔕 FIXED: Unsubscribing page from webhook...`);
    
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me/subscribed_apps?access_token=${pageAccessToken}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Facebook Webhook unsubscription error: ${response.status} - ${error}`
      );
    }

    const result = await response.json();
    console.log("✅ Unsubscribed from webhook:", result);
    return result;
  }

  /**
   * Get user profile information
   */
  async getUserProfile(
    userId: string,
    pageAccessToken: string,
    fields: string[] = [
      "first_name",
      "last_name",
      "profile_pic",
      "locale",
      "timezone",
    ]
  ): Promise<{
    first_name?: string;
    last_name?: string;
    profile_pic?: string;
    locale?: string;
    timezone?: number;
  }> {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${userId}?fields=${fields.join(
        ","
      )}&access_token=${pageAccessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Facebook User Profile API error: ${response.status} - ${error}`
      );
    }

    return await response.json();
  }

  /**
   * Parse webhook payload and extract messaging events
   */
  parseWebhookPayload(payload: any): FacebookWebhookEntry[] {
    if (!payload.object || payload.object !== "page") {
      throw new Error("Invalid webhook payload: not a page object");
    }

    if (!payload.entry || !Array.isArray(payload.entry)) {
      throw new Error(
        "Invalid webhook payload: missing or invalid entry array"
      );
    }

    return payload.entry;
  }

  /**
   * Check if a messaging event is a message
   */
  isMessageEvent(event: FacebookMessagingEvent): boolean {
    return !!(event.message && event.message.text && !event.message.is_echo);
  }

  /**
   * Check if a messaging event is a delivery confirmation
   */
  isDeliveryEvent(event: FacebookMessagingEvent): boolean {
    return !!event.delivery;
  }

  /**
   * Check if a messaging event is a read confirmation
   */
  isReadEvent(event: FacebookMessagingEvent): boolean {
    return !!event.read;
  }

  /**
   * Check if a messaging event is a postback
   */
  isPostbackEvent(event: FacebookMessagingEvent): boolean {
    return !!event.postback;
  }

  /**
   * NEW: Batch subscribe multiple pages - PROPER WAY FOR MULTIPLE PAGES
   */
  async batchSubscribePages(pageTokens: Array<{ pageId: string; accessToken: string }>): Promise<{
    successful: string[];
    failed: Array<{ pageId: string; error: string }>;
  }> {
    console.log(`🔄 BATCH: Subscribing ${pageTokens.length} pages to webhooks...`);
    
    const successful: string[] = [];
    const failed: Array<{ pageId: string; error: string }> = [];

    for (const { pageId, accessToken } of pageTokens) {
      try {
        await this.subscribePageToWebhook(accessToken);
        successful.push(pageId);
        console.log(`✅ BATCH: Successfully subscribed page ${pageId}`);
      } catch (error) {
        failed.push({
          pageId,
          error: error instanceof Error ? error.message : "Unknown error"
        });
        console.error(`❌ BATCH: Failed to subscribe page ${pageId}:`, error);
      }
    }

    console.log(`🎯 BATCH COMPLETE: ${successful.length} successful, ${failed.length} failed`);
    return { successful, failed };
  }

  /**
   * NEW: Check webhook subscription status for a page
   */
  async checkPageWebhookStatus(pageAccessToken: string): Promise<{
    isSubscribed: boolean;
    appId?: string;
    subscribedFields?: string[];
  }> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/me/subscribed_apps?access_token=${pageAccessToken}`
      );

      if (!response.ok) {
        return { isSubscribed: false };
      }

      const data = await response.json();
      
      if (data.data && data.data.length > 0) {
        const subscription = data.data.find((app: any) => app.id === process.env.FACEBOOK_APP_ID);
        if (subscription) {
          return {
            isSubscribed: true,
            appId: subscription.id,
            subscribedFields: subscription.subscribed_fields || []
          };
        }
      }

      return { isSubscribed: false };
    } catch (error) {
      console.error("Error checking webhook status:", error);
      return { isSubscribed: false };
    }
  }
}

export const facebookAPIFixed = new FacebookAPIFixed();
export default facebookAPIFixed;
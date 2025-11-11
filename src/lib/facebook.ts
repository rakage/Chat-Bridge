import crypto from "crypto";
import { decrypt } from "./encryption";

// Enhanced type definitions for comprehensive messaging support

export interface FacebookWebhookEntry {
  id: string;
  time: number;
  messaging: FacebookMessagingEvent[];
}

export interface FacebookAttachment {
  type: 'image' | 'video' | 'audio' | 'file' | 'template' | 'fallback';
  payload: {
    url?: string;
    attachment_id?: string;
    template_type?: string;
    elements?: any[];
    buttons?: FacebookButton[];
    [key: string]: any;
  };
}

export interface FacebookButton {
  type: 'web_url' | 'postback' | 'phone_number' | 'account_link' | 'account_unlink';
  title: string;
  url?: string;
  payload?: string;
  phone_number?: string;
}

export interface FacebookQuickReply {
  content_type: 'text' | 'user_phone_number' | 'user_email';
  title?: string;
  payload?: string;
  image_url?: string;
}

export interface FacebookMessage {
  mid: string;
  text?: string;
  attachments?: FacebookAttachment[];
  quick_reply?: {
    payload: string;
  };
  reply_to?: {
    mid: string;
  };
  is_echo?: boolean;
  app_id?: number;
  metadata?: string;
  sticker_id?: number;
}

export interface FacebookMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: FacebookMessage;
  delivery?: {
    mids: string[];
    watermark: number;
    seq?: number;
  };
  read?: {
    watermark: number;
    seq?: number;
  };
  postback?: {
    title: string;
    payload: string;
    referral?: FacebookReferral;
  };
  account_linking?: {
    status: 'linked' | 'unlinked';
    authorization_code?: string;
  };
  checkout_update?: {
    payload: any;
  };
  payment?: {
    payload: any;
  };
  pre_checkout?: {
    payload: any;
  };
  game_play?: {
    game_id: string;
    player_id: string;
    context_type: string;
    context_id: string;
    score: number;
    payload: string;
  };
  handover?: {
    new_owner_app_id: string;
    metadata?: string;
  };
  optin?: {
    ref: string;
    user_ref?: string;
  };
  policy_enforcement?: {
    action: string;
    reason: string;
  };
  referral?: FacebookReferral;
  reaction?: {
    mid: string;
    action: 'react' | 'unreact';
    emoji?: string;
    reaction?: string;
  };
  message_edit?: {
    mid: string;
    text: string;
  };
}

export interface FacebookReferral {
  ref: string;
  source: string;
  type: string;
  referer_uri?: string;
  is_guest_user?: boolean;
}

export interface FacebookSendMessageRequest {
  recipient: {
    id?: string;
    user_ref?: string;
    comment_id?: string;
    post_id?: string;
  };
  message?: {
    text?: string;
    attachment?: FacebookAttachment;
    quick_replies?: FacebookQuickReply[];
    metadata?: string;
  };
  messaging_type?: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG';
  notification_type?: 'REGULAR' | 'SILENT_PUSH' | 'NO_PUSH';
  tag?: 'ACCOUNT_UPDATE' | 'CONFIRMED_EVENT_UPDATE' | 'CUSTOMER_FEEDBACK' | 
        'HUMAN_AGENT' | 'POST_PURCHASE_UPDATE';
  sender_action?: 'typing_on' | 'typing_off' | 'mark_seen';
  reply_to?: {
    mid: string;
  };
}

export interface FacebookGenericTemplateElement {
  title: string;
  subtitle?: string;
  image_url?: string;
  default_action?: {
    type: 'web_url';
    url: string;
    messenger_extensions?: boolean;
    webview_height_ratio?: 'compact' | 'tall' | 'full';
  };
  buttons?: FacebookButton[];
}

export interface FacebookButtonTemplate {
  template_type: 'button';
  text: string;
  buttons: FacebookButton[];
}

export interface FacebookGenericTemplate {
  template_type: 'generic';
  elements: FacebookGenericTemplateElement[];
  image_aspect_ratio?: 'horizontal' | 'square';
}

export interface FacebookMediaTemplate {
  template_type: 'media';
  elements: Array<{
    media_type: 'image' | 'video';
    url?: string;
    attachment_id?: string;
    buttons?: FacebookButton[];
  }>;
}

export interface FacebookAttachmentUploadRequest {
  message: {
    attachment: {
      type: 'image' | 'video' | 'audio' | 'file';
      payload: {
        url?: string;
        is_reusable?: boolean;
      };
    };
  };
}

export class FacebookAPI {
  private appSecret: string;
  private apiVersion: string;

  constructor() {
    if (!process.env.FACEBOOK_APP_SECRET) {
      throw new Error("FACEBOOK_APP_SECRET environment variable is required");
    }
    this.appSecret = process.env.FACEBOOK_APP_SECRET;
    this.apiVersion = process.env.FACEBOOK_API_VERSION || 'v23.0';
  }

  /**
   * Verify webhook signature from Facebook (supports both SHA1 and SHA256)
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!signature) {
      return false;
    }

    const elements = signature.split("=");
    const method = elements[0];
    const signatureHash = elements[1];

    // Support both SHA1 (legacy) and SHA256 (recommended)
    if (method !== "sha1" && method !== "sha256") {
      return false;
    }

    const expectedHash = crypto
      .createHmac(method, this.appSecret)
      .update(payload, "utf8")
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  }

  /**
   * Verify webhook signature specifically for SHA256 (recommended method)
   */
  verifyWebhookSignatureSHA256(payload: string, signature: string): boolean {
    if (!signature || !signature.startsWith('sha256=')) {
      return false;
    }

    const signatureHash = signature.replace('sha256=', '');
    const expectedHash = crypto
      .createHmac('sha256', this.appSecret)
      .update(payload, 'utf8')
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signatureHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
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
  ): Promise<{ message_id?: string; recipient_id?: string }> {
    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/me/messages?access_token=${pageAccessToken}`,
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
   * Send typing indicator
   */
  async sendTypingIndicator(
    pageAccessToken: string,
    recipientId: string,
    action: 'typing_on' | 'typing_off' | 'mark_seen'
  ): Promise<{ recipient_id: string }> {
    const request: FacebookSendMessageRequest = {
      recipient: { id: recipientId },
      sender_action: action,
    };

    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/me/messages?access_token=${pageAccessToken}`,
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
   * Send text message with quick replies
   */
  async sendTextWithQuickReplies(
    pageAccessToken: string,
    recipientId: string,
    text: string,
    quickReplies: FacebookQuickReply[],
    messagingType: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG' = 'RESPONSE'
  ): Promise<{ message_id?: string; recipient_id?: string }> {
    const request: FacebookSendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        text,
        quick_replies: quickReplies,
      },
    };

    return await this.sendMessage(pageAccessToken, request);
  }

  /**
   * Send generic template (carousel)
   */
  async sendGenericTemplate(
    pageAccessToken: string,
    recipientId: string,
    elements: FacebookGenericTemplateElement[],
    messagingType: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG' = 'RESPONSE'
  ): Promise<{ message_id?: string; recipient_id?: string }> {
    const template: FacebookGenericTemplate = {
      template_type: 'generic',
      elements,
    };

    const request: FacebookSendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: 'template',
          payload: template,
        },
      },
    };

    return await this.sendMessage(pageAccessToken, request);
  }

  /**
   * Send button template
   */
  async sendButtonTemplate(
    pageAccessToken: string,
    recipientId: string,
    text: string,
    buttons: FacebookButton[],
    messagingType: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG' = 'RESPONSE'
  ): Promise<{ message_id?: string; recipient_id?: string }> {
    const template: FacebookButtonTemplate = {
      template_type: 'button',
      text,
      buttons,
    };

    const request: FacebookSendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: 'template',
          payload: template,
        },
      },
    };

    return await this.sendMessage(pageAccessToken, request);
  }

  /**
   * Upload attachment for reuse in messages
   */
  async uploadAttachment(
    pageAccessToken: string,
    attachmentType: 'image' | 'video' | 'audio' | 'file',
    url: string,
    isReusable: boolean = true
  ): Promise<{ attachment_id: string }> {
    const request: FacebookAttachmentUploadRequest = {
      message: {
        attachment: {
          type: attachmentType,
          payload: {
            url,
            is_reusable: isReusable,
          },
        },
      },
    };

    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/me/message_attachments?access_token=${pageAccessToken}`,
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
      throw new Error(`Facebook Attachment Upload API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Send message with uploaded attachment
   */
  async sendAttachmentById(
    pageAccessToken: string,
    recipientId: string,
    attachmentType: 'image' | 'video' | 'audio' | 'file',
    attachmentId: string,
    messagingType: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG' = 'RESPONSE'
  ): Promise<{ message_id?: string; recipient_id?: string }> {
    const request: FacebookSendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: attachmentType,
          payload: {
            attachment_id: attachmentId,
          },
        },
      },
    };

    return await this.sendMessage(pageAccessToken, request);
  }

  /**
   * Send message with attachment URL (upload and send in one call)
   */
  async sendAttachmentByUrl(
    pageAccessToken: string,
    recipientId: string,
    attachmentType: 'image' | 'video' | 'audio' | 'file',
    url: string,
    messagingType: 'RESPONSE' | 'UPDATE' | 'MESSAGE_TAG' = 'RESPONSE'
  ): Promise<{ message_id?: string; recipient_id?: string }> {
    const request: FacebookSendMessageRequest = {
      recipient: { id: recipientId },
      messaging_type: messagingType,
      message: {
        attachment: {
          type: attachmentType,
          payload: {
            url,
          },
        },
      },
    };

    return await this.sendMessage(pageAccessToken, request);
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
    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/me?fields=id,name,category,picture{url,is_silhouette}&access_token=${pageAccessToken}`
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Facebook Graph API error: ${response.status} - ${error}`
        );
      }

      return await response.json();
    } catch (error) {
      console.warn(`⚠️ Could not fetch profile picture for page: ${error}`);
      
      // Fallback: fetch basic info without picture
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/me?fields=id,name,category&access_token=${pageAccessToken}`
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Facebook Graph API error: ${response.status} - ${error}`
        );
      }

      const pageData = await response.json();
      
      // Construct public picture URL as fallback
      return {
        ...pageData,
        picture: {
          data: {
            url: `https://graph.facebook.com/${pageData.id}/picture?type=large`,
            is_silhouette: false,
          },
        },
      };
    }
  }

  /**
   * Get page statistics (followers count and posts count)
   */
  async getPageStatistics(pageAccessToken: string): Promise<{
    followersCount: number;
    postsCount: number;
  }> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/me?fields=followers_count,published_posts.limit(0).summary(true)&access_token=${pageAccessToken}`
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Facebook Graph API error: ${response.status} - ${error}`
        );
      }

      const data = await response.json();
      
      return {
        followersCount: data.followers_count || 0,
        postsCount: data.published_posts?.summary?.total_count || 0,
      };
    } catch (error) {
      console.warn(`⚠️ Could not fetch page statistics: ${error}`);
      return {
        followersCount: 0,
        postsCount: 0,
      };
    }
  }

  /**
   * Get comprehensive page data (info + statistics)
   */
  async getPageFullData(pageAccessToken: string): Promise<{
    id: string;
    name: string;
    category: string;
    profilePictureUrl: string | null;
    followersCount: number;
    postsCount: number;
  }> {
    try {
      // Fetch page info and statistics in parallel
      const [pageInfo, statistics] = await Promise.all([
        this.getPageInfo(pageAccessToken),
        this.getPageStatistics(pageAccessToken),
      ]);

      return {
        id: pageInfo.id,
        name: pageInfo.name,
        category: pageInfo.category,
        profilePictureUrl: pageInfo.picture?.data?.url || null,
        followersCount: statistics.followersCount,
        postsCount: statistics.postsCount,
      };
    } catch (error) {
      console.error(`❌ Failed to fetch full page data: ${error}`);
      throw error;
    }
  }

  /**
   * Subscribe page to webhook events
   */
  async subscribePageToWebhook(
    pageId: string,
    pageAccessToken: string,
    subscribedFields: string[] = [
      "messages",
      "messaging_postbacks",
      "message_deliveries",
      "message_reads",
    ]
  ): Promise<{ success: boolean }> {
    const url = new URL(
      `https://graph.facebook.com/${this.apiVersion}/${pageId}/subscribed_apps`
    );
    url.searchParams.set("access_token", pageAccessToken);
    url.searchParams.set(
      "subscribed_fields",
      subscribedFields.join(",")
    );

    const response = await fetch(url.toString(), {
      method: "POST",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Facebook Webhook subscription error: ${response.status} - ${error}`
      );
    }

    return await response.json();
  }

  /**
   * Unsubscribe page from webhook events
   */
  async unsubscribePageFromWebhook(
    pageId: string,
    pageAccessToken: string
  ): Promise<{ success: boolean }> {
    const url = new URL(
      `https://graph.facebook.com/${this.apiVersion}/${pageId}/subscribed_apps`
    );
    url.searchParams.set("access_token", pageAccessToken);

    const response = await fetch(url.toString(), {
      method: "DELETE",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `Facebook Webhook unsubscription error: ${response.status} - ${error}`
      );
    }

    return await response.json();
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
   * Check if a messaging event is an account linking event
   */
  isAccountLinkingEvent(event: FacebookMessagingEvent): boolean {
    return !!event.account_linking;
  }

  /**
   * Check if a messaging event is an optin event
   */
  isOptinEvent(event: FacebookMessagingEvent): boolean {
    return !!event.optin;
  }

  /**
   * Check if a messaging event is a referral event
   */
  isReferralEvent(event: FacebookMessagingEvent): boolean {
    return !!event.referral;
  }

  /**
   * Check if a messaging event is a payment event
   */
  isPaymentEvent(event: FacebookMessagingEvent): boolean {
    return !!event.payment;
  }

  /**
   * Check if a messaging event is a checkout update event
   */
  isCheckoutUpdateEvent(event: FacebookMessagingEvent): boolean {
    return !!event.checkout_update;
  }

  /**
   * Check if a messaging event is a pre-checkout event
   */
  isPreCheckoutEvent(event: FacebookMessagingEvent): boolean {
    return !!event.pre_checkout;
  }

  /**
   * Check if a messaging event is a game play event
   */
  isGamePlayEvent(event: FacebookMessagingEvent): boolean {
    return !!event.game_play;
  }

  /**
   * Check if a messaging event is a handover event
   */
  isHandoverEvent(event: FacebookMessagingEvent): boolean {
    return !!event.handover;
  }

  /**
   * Check if a messaging event is a policy enforcement event
   */
  isPolicyEnforcementEvent(event: FacebookMessagingEvent): boolean {
    return !!event.policy_enforcement;
  }

  /**
   * Check if a messaging event is a message reaction event
   */
  isReactionEvent(event: FacebookMessagingEvent): boolean {
    return !!event.reaction;
  }

  /**
   * Check if a messaging event is a message edit event
   */
  isMessageEditEvent(event: FacebookMessagingEvent): boolean {
    return !!event.message_edit;
  }

  /**
   * Check if a message has quick reply
   */
  hasQuickReply(event: FacebookMessagingEvent): boolean {
    return !!(event.message && event.message.quick_reply);
  }

  /**
   * Check if a message is an echo (sent by the page)
   */
  isEchoMessage(event: FacebookMessagingEvent): boolean {
    return !!(event.message && event.message.is_echo);
  }

  /**
   * Check if a message has attachments
   */
  hasAttachments(event: FacebookMessagingEvent): boolean {
    return !!(event.message && event.message.attachments && event.message.attachments.length > 0);
  }

  /**
   * Get attachment type from message
   */
  getAttachmentType(event: FacebookMessagingEvent): string | null {
    if (this.hasAttachments(event) && event.message?.attachments) {
      return event.message.attachments[0].type;
    }
    return null;
  }

  /**
   * Get quick reply payload
   */
  getQuickReplyPayload(event: FacebookMessagingEvent): string | null {
    if (this.hasQuickReply(event) && event.message?.quick_reply) {
      return event.message.quick_reply.payload;
    }
    return null;
  }

  /**
   * Get postback payload
   */
  getPostbackPayload(event: FacebookMessagingEvent): string | null {
    if (this.isPostbackEvent(event) && event.postback) {
      return event.postback.payload;
    }
    return null;
  }
}

export const facebookAPI = new FacebookAPI();
export default facebookAPI;

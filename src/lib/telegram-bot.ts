export interface TelegramBotConfig {
  botToken: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  photo?: TelegramPhotoSize[];
  document?: TelegramDocument;
}

export interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface TelegramDocument {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
  channel_post?: TelegramMessage;
  edited_channel_post?: TelegramMessage;
}

export interface TelegramWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_date?: number;
  last_error_message?: string;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface TelegramGetMeResponse {
  ok: boolean;
  result?: TelegramUser;
  description?: string;
}

export interface TelegramSetWebhookResponse {
  ok: boolean;
  result?: boolean;
  description?: string;
}

export interface TelegramSendMessageResponse {
  ok: boolean;
  result?: TelegramMessage;
  description?: string;
}

export interface TelegramGetWebhookInfoResponse {
  ok: boolean;
  result?: TelegramWebhookInfo;
  description?: string;
}

export interface TelegramFileResponse {
  ok: boolean;
  result?: {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
  };
  description?: string;
}

export class TelegramBot {
  private botToken: string;
  private apiUrl: string;

  constructor(botToken: string) {
    this.botToken = botToken;
    this.apiUrl = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Get bot information (test if token is valid)
   */
  async getMe(): Promise<TelegramGetMeResponse> {
    const response = await fetch(`${this.apiUrl}/getMe`);
    return await response.json();
  }

  /**
   * Set webhook for receiving updates
   */
  async setWebhook(webhookUrl: string): Promise<TelegramSetWebhookResponse> {
    const response = await fetch(`${this.apiUrl}/setWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: webhookUrl,
        allowed_updates: ["message", "edited_message"],
        drop_pending_updates: true,
      }),
    });

    return await response.json();
  }

  /**
   * Delete webhook (stop receiving updates)
   */
  async deleteWebhook(): Promise<TelegramSetWebhookResponse> {
    const response = await fetch(`${this.apiUrl}/deleteWebhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        drop_pending_updates: true,
      }),
    });

    return await response.json();
  }

  /**
   * Get current webhook info
   */
  async getWebhookInfo(): Promise<TelegramGetWebhookInfoResponse> {
    const response = await fetch(`${this.apiUrl}/getWebhookInfo`);
    return await response.json();
  }

  /**
   * Send a text message
   */
  async sendMessage(
    chatId: number | string,
    text: string,
    replyToMessageId?: number
  ): Promise<TelegramSendMessageResponse> {
    const response = await fetch(`${this.apiUrl}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        reply_to_message_id: replyToMessageId,
      }),
    });

    return await response.json();
  }

  /**
   * Send a photo
   */
  async sendPhoto(
    chatId: number | string,
    photo: string,
    caption?: string
  ): Promise<TelegramSendMessageResponse> {
    const response = await fetch(`${this.apiUrl}/sendPhoto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        photo: photo,
        caption: caption,
      }),
    });

    return await response.json();
  }

  /**
   * Get file info and download URL
   */
  async getFile(fileId: string): Promise<TelegramFileResponse> {
    const response = await fetch(`${this.apiUrl}/getFile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file_id: fileId,
      }),
    });

    return await response.json();
  }

  /**
   * Get file download URL
   */
  getFileUrl(filePath: string): string {
    return `https://api.telegram.org/file/bot${this.botToken}/${filePath}`;
  }

  /**
   * Get user profile photos
   */
  async getUserProfilePhotos(
    userId: number,
    offset?: number,
    limit?: number
  ): Promise<any> {
    const params = new URLSearchParams({
      user_id: userId.toString(),
    });

    if (offset !== undefined) {
      params.set("offset", offset.toString());
    }
    if (limit !== undefined) {
      params.set("limit", limit.toString());
    }

    const response = await fetch(
      `${this.apiUrl}/getUserProfilePhotos?${params.toString()}`
    );
    return await response.json();
  }

  /**
   * Send chat action (typing indicator)
   */
  async sendChatAction(
    chatId: number | string,
    action: "typing" | "upload_photo" | "upload_document" = "typing"
  ): Promise<any> {
    const response = await fetch(`${this.apiUrl}/sendChatAction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        action: action,
      }),
    });

    return await response.json();
  }
}

/**
 * Helper function to validate bot token format
 */
export function isValidBotToken(token: string): boolean {
  // Telegram bot tokens are in format: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz
  const tokenRegex = /^\d{8,10}:[A-Za-z0-9_-]{35}$/;
  return tokenRegex.test(token);
}

/**
 * Helper function to extract bot ID from token
 */
export function getBotIdFromToken(token: string): string {
  return token.split(":")[0];
}

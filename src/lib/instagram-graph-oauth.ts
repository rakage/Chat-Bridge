export interface InstagramGraphOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface InstagramGraphAccessTokenResponse {
  access_token: string;
  user_id: number;
}

export interface InstagramGraphUserProfile {
  id: string;
  name?: string;
  username: string;
  profile_picture_url?: string;
  account_type: string;
  media_count?: number;
}

export class InstagramGraphOAuth {
  private config: InstagramGraphOAuthConfig;

  constructor() {
    // Use Instagram App credentials for Instagram Business Login (official flow)
    if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
      throw new Error("Instagram App credentials are required for Instagram Business Login");
    }

    this.config = {
      clientId: process.env.INSTAGRAM_APP_ID,
      clientSecret: process.env.INSTAGRAM_APP_SECRET,
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/instagram/callback`,
    };
    
    console.log(`🔧 Instagram Graph OAuth configured with App ID: ${this.config.clientId}`);
    console.log(`🔗 Redirect URI: ${this.config.redirectUri}`);
  }

  /**
   * Generate Instagram OAuth login URL
   * Note: This might need to be a Facebook OAuth URL even for Instagram apps
   * depending on how your Instagram app is set up
   */
  getLoginUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: [
        "instagram_business_basic",
        "instagram_business_manage_messages",
        "instagram_business_manage_comments",
        "instagram_business_content_publish"
      ].join(","),
      response_type: "code",
      state: state || this.generateState()
    });

    // Use official Instagram Business Login endpoint
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Alternative: Get Facebook OAuth URL for Instagram apps
   * Some Instagram apps require Facebook OAuth flow
   */
  getFacebookLoginUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: [
        "instagram_basic",
        "instagram_manage_messages",
        "pages_show_list"
      ].join(","),
      response_type: "code",
      state: state || this.generateState()
    });

    return `https://www.facebook.com/v22.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Generate a random state parameter for CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Exchange authorization code for access token
   * This will try both Instagram and Facebook endpoints
   */
  async exchangeCodeForToken(code: string): Promise<InstagramGraphAccessTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: this.config.redirectUri,
      code: code,
    });

    console.log('🔄 Exchanging code for Instagram Business access token');
    
    // Use official Instagram Business Login token endpoint
    const response = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Instagram OAuth token exchange failed:', error);
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const tokenData = await response.json();
    console.log('✅ Instagram Business access token obtained successfully');
    
    // The response format includes a data array according to the documentation
    if (tokenData.data && tokenData.data.length > 0) {
      const data = tokenData.data[0];
      return {
        access_token: data.access_token,
        user_id: parseInt(data.user_id)
      };
    } else {
      // Fallback for direct response format
      return {
        access_token: tokenData.access_token,
        user_id: tokenData.user_id || 0
      };
    }
  }

  /**
   * Get Instagram user profile with correct webhook-compatible ID
   * Solution: Request BOTH 'id' and 'user_id' fields from Instagram Graph API
   * - 'id': App-scoped Facebook user ID  
   * - 'user_id': Instagram Professional Account ID (matches webhook recipient ID)
   */
  async getUserProfile(accessToken: string): Promise<InstagramGraphUserProfile> {
    console.log('🔄 Getting Instagram profile with webhook-compatible ID');
    
    try {
      // Use Instagram Graph API with user_id field - this is the key!
      console.log('🔍 Requesting both id and user_id fields for webhook compatibility');
      
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,user_id,username,account_type,media_count,profile_picture_url&access_token=${accessToken}`
      );

      if (!response.ok) {
        const error = await response.text();
        console.error('❌ Failed to get Instagram profile:', error);
        throw new Error(`Failed to get Instagram profile: ${error}`);
      }

      const userData = await response.json();
      console.log(`✅ Instagram profile retrieved: @${userData.username}`);
      console.log(`   🆔 App-scoped ID: ${userData.id}`);
      console.log(`   🎯 Professional Account ID (user_id): ${userData.user_id}`);
      console.log(`   📱 Webhook recipient ID will be: ${userData.user_id}`);
      
      // Use user_id as the Instagram ID - this matches webhook recipient ID!
      const correctWebhookId = userData.user_id || userData.id; // Fallback to id if user_id not available
      
      return {
        id: correctWebhookId, // This is the CORRECT webhook recipient ID!
        name: userData.name,
        username: userData.username,
        profile_picture_url: userData.profile_picture_url,
        account_type: userData.account_type || 'BUSINESS',
        media_count: userData.media_count || 0
      };
      
    } catch (error) {
      console.error('❌ Error getting Instagram profile:', error);
      throw error;
    }
  }

  /**
   * Get conversations using the same endpoint as your repository
   */
  async getConversations(accessToken: string, after?: string) {
    console.log('🔄 Getting Instagram conversations (matching repository pattern)');
    
    const params = new URLSearchParams({
      platform: "instagram",
      fields: "participant,from,message,messages{created_time,from,message,reactions,shares}",
      access_token: accessToken,
    });

    if (after) {
      params.set("after", after);
    }

    const response = await fetch(
      `https://graph.instagram.com/v22.0/me/conversations?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to get conversations:', error);
      throw new Error(`Failed to get conversations: ${error}`);
    }

    const data = await response.json();
    console.log(`✅ Retrieved ${data.data?.length || 0} conversations`);
    
    return data;
  }

  /**
   * Send message using the same endpoint as your repository
   */
  async sendMessage(accessToken: string, recipientId: string, messageText: string, igUserId?: string) {
    console.log(`🚀 Sending Instagram message to ${recipientId} (official API)`);
    
    // Use the Instagram professional account ID or default to /me
    const endpoint = igUserId ? `/${igUserId}/messages` : '/me/messages';
    
    const response = await fetch(`https://graph.instagram.com/v23.0${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to send Instagram message:', error);
      throw new Error(`Failed to send Instagram message: ${error}`);
    }

    const result = await response.json();
    console.log(`✅ Instagram message sent successfully: ${result.message_id || result.id}`);
    
    return result;
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   * According to Instagram Business Login documentation
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
    console.log('🔄 Exchanging for long-lived Instagram Business token (60 days)');
    
    const params = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: this.config.clientSecret,
      access_token: shortLivedToken
    });

    const response = await fetch(`https://graph.instagram.com/access_token?${params.toString()}`, {
      method: "GET"
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Long-lived token exchange failed:', error);
      throw new Error(`Failed to get long-lived token: ${error}`);
    }

    const tokenData = await response.json();
    console.log(`✅ Long-lived token obtained (expires in ${tokenData.expires_in} seconds)`);
    
    return {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in // Should be around 60 days (5184000 seconds)
    };
  }
}
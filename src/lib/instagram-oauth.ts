export interface InstagramOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface InstagramAccessTokenResponse {
  access_token: string;
  user_id: number;
}

export interface InstagramUserProfile {
  id: string;
  username: string;
  account_type: string;
  media_count: number;
}

export interface InstagramMediaItem {
  id: string;
  media_type: string;
  media_url: string;
  permalink: string;
  timestamp: string;
  caption?: string;
}

export interface InstagramMediaResponse {
  data: InstagramMediaItem[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export class InstagramOAuth {
  private config: InstagramOAuthConfig;

  constructor() {
    // Use Facebook App credentials for Instagram Business API
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      throw new Error("Facebook App credentials are required for Instagram Business API");
    }

    this.config = {
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/instagram/callback`,
    };
    
    console.log(`🔧 Instagram OAuth configured with Facebook App ID: ${this.config.clientId}`);
    console.log(`🔗 Redirect URI: ${this.config.redirectUri}`);
  }

  /**
   * Generate the Instagram Business OAuth login URL for messaging
   * Using Facebook Login for Instagram Business API access
   */
  getLoginUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: [
        "instagram_basic",
        "instagram_manage_messages",
        "instagram_manage_comments",
        "instagram_content_publish",
        "pages_read_engagement",
        "pages_show_list",
        "business_management"
      ].join(","),
      response_type: "code",
      state: state || this.generateState()
    });

    return `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`;
  }

  /**
   * Generate a random state parameter for CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Exchange authorization code for Facebook access token (for Instagram Business API)
   */
  async exchangeCodeForToken(code: string): Promise<InstagramAccessTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: this.config.redirectUri,
      code: code,
    });

    console.log('🔄 Exchanging code for Facebook access token (for Instagram Business API)');
    const response = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Facebook OAuth token exchange failed:', error);
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const tokenData = await response.json();
    console.log('✅ Facebook access token obtained successfully');
    
    // Convert to expected format
    return {
      access_token: tokenData.access_token,
      user_id: tokenData.user_id || 0 // Facebook doesn't return user_id in this endpoint
    };
  }

  /**
   * Get Instagram Business Account information via Facebook API
   */
  async getUserProfile(accessToken: string): Promise<InstagramUserProfile> {
    console.log('🔄 Getting Instagram Business Account info via Facebook API');
    
    // First, get Facebook user's pages to find Instagram Business Account
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?fields=instagram_business_account{id,username,account_type,media_count,profile_picture_url}&access_token=${accessToken}`
    );

    if (!pagesResponse.ok) {
      const error = await pagesResponse.text();
      console.error('❌ Failed to get pages:', error);
      throw new Error(`Failed to get pages: ${error}`);
    }

    const pagesData = await pagesResponse.json();
    console.log('📄 Pages response:', JSON.stringify(pagesData, null, 2));

    // Find Instagram Business Account
    if (pagesData.data && pagesData.data.length > 0) {
      for (const page of pagesData.data) {
        if (page.instagram_business_account) {
          const igAccount = page.instagram_business_account;
          console.log(`✅ Found Instagram Business Account: @${igAccount.username} (${igAccount.id})`);
          
          return {
            id: igAccount.id,
            username: igAccount.username,
            account_type: igAccount.account_type || 'BUSINESS',
            media_count: igAccount.media_count || 0
          };
        }
      }
    }

    throw new Error('No Instagram Business Account found. Please make sure you have a Facebook Page connected to an Instagram Business Account.');
  }

  /**
   * Get Instagram Business Account ID (for webhooks/messaging)
   * This is different from the basic user profile ID
   * 
   * Note: For Instagram Business messaging, webhooks are sent to the Instagram Business Account ID,
   * not the basic user profile ID. This method attempts to get the correct business account ID.
   */
  async getBusinessAccountId(accessToken: string): Promise<string> {
    try {
      console.log('🔍 Attempting to get Instagram Business Account ID...');
      
      // Method 1: Try Instagram Business Account endpoint directly
      try {
        console.log('🔍 Method 1: Trying Instagram Business Account endpoint...');
        const businessResponse = await fetch(
          `https://graph.facebook.com/me/accounts?fields=instagram_business_account{id,username}&access_token=${accessToken}`
        );
        
        if (businessResponse.ok) {
          const businessData = await businessResponse.json();
          console.log('📄 Facebook Business API response:', JSON.stringify(businessData, null, 2));
          
          // Find Instagram Business Account
          if (businessData.data && businessData.data.length > 0) {
            for (const page of businessData.data) {
              if (page.instagram_business_account) {
                console.log(`✅ Found Instagram Business Account ID: ${page.instagram_business_account.id}`);
                return page.instagram_business_account.id;
              }
            }
          }
        } else {
          console.log('⚠️ Facebook Business API failed:', await businessResponse.text());
        }
      } catch (businessError) {
        console.log('⚠️ Method 1 failed:', businessError);
      }
      
      // Method 2: Try to get Instagram account info via different endpoint
      try {
        console.log('🔍 Method 2: Trying Instagram account info endpoint...');
        const accountResponse = await fetch(
          `https://graph.facebook.com/me?fields=accounts{instagram_business_account}&access_token=${accessToken}`
        );
        
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          console.log('📄 Account info response:', JSON.stringify(accountData, null, 2));
          
          if (accountData.accounts && accountData.accounts.data) {
            for (const account of accountData.accounts.data) {
              if (account.instagram_business_account) {
                console.log(`✅ Found Instagram Business Account ID via account info: ${account.instagram_business_account}`);
                return account.instagram_business_account;
              }
            }
          }
        } else {
          console.log('⚠️ Account info API failed:', await accountResponse.text());
        }
      } catch (accountError) {
        console.log('⚠️ Method 2 failed:', accountError);
      }
      
      // Method 3: Fallback to basic Instagram Graph API
      try {
        console.log('🔍 Method 3: Fallback to basic Instagram API...');
        const basicResponse = await fetch(
          `https://graph.instagram.com/me?fields=id&access_token=${accessToken}`
        );
        
        if (basicResponse.ok) {
          const basicData = await basicResponse.json();
          console.log(`📱 Basic Instagram API returned ID: ${basicData.id}`);
          console.log('⚠️ Warning: This might be the basic profile ID, not business account ID');
          return basicData.id;
        }
      } catch (basicError) {
        console.log('⚠️ Method 3 failed:', basicError);
      }
      
      throw new Error('Could not retrieve Instagram Business Account ID from any API endpoint');
      
    } catch (error) {
      console.error('❌ Error getting Instagram Business Account ID:', error);
      console.log('💡 The issue might be that Instagram Basic Display API tokens');
      console.log('   cannot access Facebook Business API endpoints.');
      console.log('💡 The business account ID (for webhooks) might be different from');
      console.log('   the basic profile ID returned by Instagram Basic Display API.');
      throw error;
    }
  }

  /**
   * Get user's Instagram media
   */
  async getUserMedia(accessToken: string, limit: number = 25): Promise<InstagramMediaItem[]> {
    const response = await fetch(
      `https://graph.instagram.com/me/media?fields=id,media_type,media_url,permalink,timestamp,caption&limit=${limit}&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user media: ${error}`);
    }

    const data: InstagramMediaResponse = await response.json();
    return data.data;
  }

  /**
   * Exchange short-lived access token for long-lived access token
   */
  async getLongLivedAccessToken(shortLivedToken: string): Promise<InstagramAccessTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "ig_exchange_token",
      client_secret: this.config.clientSecret,
      access_token: shortLivedToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/access_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get long-lived token: ${error}`);
    }

    return await response.json();
  }

  /**
   * Refresh a long-lived access token
   */
  async refreshLongLivedAccessToken(accessToken: string): Promise<InstagramAccessTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "ig_refresh_token",
      access_token: accessToken,
    });

    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?${params.toString()}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh access token: ${error}`);
    }

    return await response.json();
  }

  /**
   * Validate if an access token is still valid
   */
  async validateAccessToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id&access_token=${accessToken}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get Instagram conversations (for messaging)
   */
  async getConversations(accessToken: string): Promise<any> {
    const response = await fetch(
      `https://graph.instagram.com/me/conversations?access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get conversations: ${error}`);
    }

    return await response.json();
  }

  /**
   * Get messages from a conversation
   */
  async getMessages(conversationId: string, accessToken: string): Promise<any> {
    const response = await fetch(
      `https://graph.instagram.com/${conversationId}/messages?fields=id,created_time,from,to,message&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get messages: ${error}`);
    }

    return await response.json();
  }

  /**
   * Send a message to Instagram user
   */
  async sendMessage(recipientId: string, message: string, accessToken: string): Promise<any> {
    const response = await fetch(
      `https://graph.instagram.com/me/messages`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipient: {
            id: recipientId
          },
          message: {
            text: message
          },
          access_token: accessToken
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send message: ${error}`);
    }

    return await response.json();
  }

  /**
   * Set up webhook for Instagram messaging
   */
  async subscribeToWebhook(pageId: string, accessToken: string): Promise<any> {
    const response = await fetch(
      `https://graph.facebook.com/${pageId}/subscribed_apps`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscribed_fields: "messages,messaging_postbacks,message_deliveries,message_reads",
          access_token: accessToken
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to subscribe to webhook: ${error}`);
    }

    return await response.json();
  }
}

export const instagramOAuth = new InstagramOAuth();

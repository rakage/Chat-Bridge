export interface InstagramBasicOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface InstagramBasicAccessTokenResponse {
  access_token: string;
  user_id: number;
}

export interface InstagramBasicUserProfile {
  id: string;
  username: string;
  account_type: string;
  media_count?: number;
}

export class InstagramBasicOAuth {
  private config: InstagramBasicOAuthConfig;

  constructor() {
    // Use Instagram App credentials for Instagram Basic Display API
    if (!process.env.INSTAGRAM_APP_ID || !process.env.INSTAGRAM_APP_SECRET) {
      throw new Error("Instagram App credentials are required for Instagram Basic Display API");
    }

    this.config = {
      clientId: process.env.INSTAGRAM_APP_ID,
      clientSecret: process.env.INSTAGRAM_APP_SECRET,
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/instagram/callback`,
    };
    
    console.log(`🔧 Instagram Basic OAuth configured with App ID: ${this.config.clientId}`);
    console.log(`🔗 Redirect URI: ${this.config.redirectUri}`);
  }

  /**
   * Generate the Instagram Basic Display OAuth login URL for messaging
   * This uses the Instagram Basic Display API which supports messaging
   */
  getLoginUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: [
        "user_profile",
        "user_media"
      ].join(","),
      response_type: "code",
      state: state || this.generateState()
    });

    return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
  }

  /**
   * Generate a random state parameter for CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Exchange authorization code for Instagram Basic Display access token
   */
  async exchangeCodeForToken(code: string): Promise<InstagramBasicAccessTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      grant_type: "authorization_code",
      redirect_uri: this.config.redirectUri,
      code: code,
    });

    console.log('🔄 Exchanging code for Instagram Basic Display access token');
    const response = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Instagram Basic OAuth token exchange failed:', error);
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const tokenData = await response.json();
    console.log('✅ Instagram Basic Display access token obtained successfully');
    
    return {
      access_token: tokenData.access_token,
      user_id: tokenData.user_id
    };
  }

  /**
   * Exchange short-lived token for long-lived token (60 days)
   * Instagram Basic Display API provides 60-day long-lived tokens
   */
  async exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in: number }> {
    console.log('🔄 Exchanging short-lived token for long-lived token (60 days)');
    
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

  /**
   * Get Instagram user profile via Basic Display API
   */
  async getUserProfile(accessToken: string): Promise<InstagramBasicUserProfile> {
    console.log('🔄 Getting Instagram user profile via Basic Display API');
    
    const response = await fetch(
      `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to get user profile:', error);
      throw new Error(`Failed to get user profile: ${error}`);
    }

    const userData = await response.json();
    console.log(`✅ Instagram user profile retrieved: @${userData.username} (${userData.id})`);
    
    return {
      id: userData.id,
      username: userData.username,
      account_type: userData.account_type || 'PERSONAL',
      media_count: userData.media_count || 0
    };
  }

  /**
   * Refresh long-lived access token
   * Instagram Basic Display tokens can be refreshed before they expire
   */
  async refreshToken(accessToken: string): Promise<{ access_token: string; expires_in: number }> {
    console.log('🔄 Refreshing Instagram Basic Display access token');
    
    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
      { method: "GET" }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Token refresh failed:', error);
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const tokenData = await response.json();
    console.log(`✅ Token refreshed successfully (expires in ${tokenData.expires_in} seconds)`);
    
    return {
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in
    };
  }
}
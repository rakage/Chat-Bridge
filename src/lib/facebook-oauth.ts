import { encrypt } from "./encryption";

export interface FacebookOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  apiVersion?: string;
}

export interface FacebookAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface FacebookUserProfile {
  id: string;
  name: string;
  email?: string;
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
  category: string;
  tasks: string[];
  picture?: {
    data?: {
      url?: string;
    };
  };
  followers_count?: number;
  fan_count?: number;
  published_posts?: {
    summary?: {
      total_count?: number;
    };
  };
}

export interface FacebookPagesResponse {
  data: FacebookPage[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
  };
}

export interface BusinessIntegrationConfig {
  config_id: string;
  name: string;
  token_type: 'user' | 'business_system_user';
  permissions: string[];
  assets: string[];
  expires_in?: number;
}

export interface SystemUserAccessTokenResponse {
  access_token: string;
  client_business_id?: string;
  expires_in?: number;
}

export interface FacebookLoginForBusinessConfig {
  config_id: string;
  response_type: 'code' | 'token';
  override_default_response_type?: boolean;
}

export interface BusinessPermission {
  permission: string;
  status: 'granted' | 'declined';
}

export class FacebookOAuth {
  private config: FacebookOAuthConfig;
  private apiVersion: string;

  constructor() {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      throw new Error("Facebook OAuth environment variables are required");
    }

    this.apiVersion = process.env.FACEBOOK_API_VERSION || 'v23.0';
    this.config = {
      clientId: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      redirectUri: process.env.FACEBOOK_REDIRECT_URI || `${process.env.NEXTAUTH_URL}/api/auth/facebook/callback`,
      apiVersion: this.apiVersion,
    };
  }

  /**
   * Generate the Facebook OAuth login URL
   */
  getLoginUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: "code", // Using code flow instead of token for security
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: [
        "pages_show_list", 
        "pages_manage_metadata",
        "pages_messaging",
        "pages_read_engagement",
        "public_profile"
      ].join(","),
      state: state || this.generateState(),
    });

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
  }

  /**
   * Generate Facebook Login for Business URL with configuration
   */
  getBusinessLoginUrl(config: FacebookLoginForBusinessConfig, state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      config_id: config.config_id,
      response_type: config.response_type,
      state: state || this.generateState(),
    });

    if (config.override_default_response_type) {
      params.set('override_default_response_type', 'true');
    }

    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
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
   */
  async exchangeCodeForToken(code: string): Promise<FacebookAccessTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      redirect_uri: this.config.redirectUri,
      code: code,
    });

    const response = await fetch(`https://graph.facebook.com/${this.apiVersion}/oauth/access_token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    return await response.json();
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken: string): Promise<FacebookUserProfile> {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me?fields=id,name,email&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user profile: ${error}`);
    }

    return await response.json();
  }

  /**
   * Get user's Facebook pages with manage permissions
   */
  async getUserPages(accessToken: string): Promise<FacebookPage[]> {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token,category,tasks,picture,followers_count,fan_count,published_posts.limit(0).summary(true)&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user pages: ${error}`);
    }

    const data: FacebookPagesResponse = await response.json();
    
    // Debug: Log all pages before filtering
    console.log("🔍 Debug: All pages from Facebook:", JSON.stringify(data.data, null, 2));
    
    // Filter pages that have MANAGE permission (or any admin-level permission)
    const manageablePages = data.data.filter(page => {
      if (!page.tasks || !Array.isArray(page.tasks)) {
        console.log(`⚠️ Page ${page.name} has no tasks array:`, page.tasks);
        return false;
      }
      
      const hasManagePermission = page.tasks.includes("MANAGE") || 
                                 page.tasks.includes("CREATE_CONTENT") ||
                                 page.tasks.includes("MODERATE") ||
                                 page.tasks.includes("ADVERTISE");
                                 
      console.log(`🔍 Page ${page.name} tasks:`, page.tasks, "-> Manageable:", hasManagePermission);
      return hasManagePermission;
    });
    
    console.log(`🔍 Debug: Found ${manageablePages.length} manageable pages out of ${data.data.length} total`);
    return manageablePages;
  }

  /**
   * Get a long-lived page access token
   */
  async getLongLivedPageToken(pageAccessToken: string): Promise<string> {
    const response = await fetch(
      `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${this.config.clientId}&client_secret=${this.config.clientSecret}&fb_exchange_token=${pageAccessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get long-lived token: ${error}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Validate if a page access token is still valid
   */
  async validatePageToken(pageAccessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.apiVersion}/me?access_token=${pageAccessToken}`
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get Business Integration System User access token client business ID
   */
  async getClientBusinessId(systemUserAccessToken: string): Promise<string> {
    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/me?fields=client_business_id&access_token=${systemUserAccessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get client business ID: ${error}`);
    }

    const data = await response.json();
    return data.client_business_id;
  }

  /**
   * Create granular Business Integration System User access token
   */
  async createGranularSystemUserToken(
    clientBusinessId: string,
    parentSystemUserToken: string,
    options: {
      assets?: string[];
      scopes?: string[];
      systemUserId?: string;
      expiresIn60Days?: boolean;
    } = {}
  ): Promise<SystemUserAccessTokenResponse> {
    const appsecretProof = this.generateAppSecretProof(parentSystemUserToken);
    
    const params = new URLSearchParams({
      access_token: parentSystemUserToken,
      appsecret_proof: appsecretProof,
    });

    if (options.assets) {
      params.set('asset', options.assets.join(','));
    }

    if (options.scopes) {
      params.set('scope', options.scopes.join(','));
    }

    if (options.systemUserId) {
      params.set('system_user_id', options.systemUserId);
    }

    if (options.expiresIn60Days) {
      params.set('set_token_expires_in_60_days', 'true');
    }

    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${clientBusinessId}/system_user_access_tokens`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create granular system user token: ${error}`);
    }

    return await response.json();
  }

  /**
   * Fetch existing system user access tokens
   */
  async fetchSystemUserTokens(
    clientBusinessId: string,
    parentSystemUserToken: string,
    systemUserId?: string
  ): Promise<SystemUserAccessTokenResponse> {
    const appsecretProof = this.generateAppSecretProof(parentSystemUserToken);
    
    const params = new URLSearchParams({
      access_token: parentSystemUserToken,
      appsecret_proof: appsecretProof,
      fetch_only: 'true',
    });

    if (systemUserId) {
      params.set('system_user_id', systemUserId);
    }

    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/${clientBusinessId}/system_user_access_tokens`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch system user tokens: ${error}`);
    }

    return await response.json();
  }

  /**
   * Check user permissions for current token
   */
  async getUserPermissions(accessToken: string): Promise<BusinessPermission[]> {
    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/me/permissions?access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get user permissions: ${error}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  /**
   * Inspect access token details
   */
  async inspectAccessToken(inputToken: string, appToken?: string): Promise<any> {
    const accessToken = appToken || `${this.config.clientId}|${this.config.clientSecret}`;
    
    const response = await fetch(
      `https://graph.facebook.com/${this.apiVersion}/debug_token?input_token=${inputToken}&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to inspect access token: ${error}`);
    }

    return await response.json();
  }

  /**
   * Generate App Secret Proof for secure API calls
   */
  private generateAppSecretProof(accessToken: string): string {
    const crypto = require('crypto');
    return crypto
      .createHmac('sha256', this.config.clientSecret)
      .update(accessToken)
      .digest('hex');
  }
}

export const facebookOAuth = new FacebookOAuth();

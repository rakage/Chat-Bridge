import { facebookAPI } from './facebook';
import { db } from './db';

export interface PageSubscriptionStatus {
  pageId: string;
  pageName: string;
  isSubscribed: boolean;
  subscriptionFields: string[];
  lastChecked: Date;
  error?: string;
}

export interface WebhookSubscriptionResult {
  success: boolean;
  subscribed: PageSubscriptionStatus[];
  failed: PageSubscriptionStatus[];
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

export class FacebookWebhookManager {
  
  private static readonly DEFAULT_FIELDS = [
    'messages',
    'messaging_postbacks', 
    'message_deliveries',
    'message_reads',
    'messaging_optins',
    'messaging_referrals',
    'messaging_account_linking',
    'messaging_checkout_updates',
    'messaging_handovers',
    'messaging_policy_enforcement',
    'message_reactions',
    'messaging_feedback',
    'messaging_game_plays',
  ];

  /**
   * Subscribe all pages for a company to webhooks
   */
  static async subscribeAllCompanyPages(companyId: string): Promise<WebhookSubscriptionResult> {
    console.log(`🔄 Starting webhook subscription for company ${companyId}`);
    
    const result: WebhookSubscriptionResult = {
      success: true,
      subscribed: [],
      failed: [],
      summary: { total: 0, successful: 0, failed: 0 }
    };

    try {
      // Get all page connections for the company
      const pageConnections = await db.pageConnection.findMany({
        where: { companyId },
        select: {
          id: true,
          pageId: true,
          pageName: true,
          pageAccessTokenEnc: true,
        }
      });

      result.summary.total = pageConnections.length;
      console.log(`🔍 Found ${pageConnections.length} pages for company ${companyId}`);

      if (pageConnections.length === 0) {
        console.log('⚠️ No pages found for this company');
        return result;
      }

      // Subscribe each page individually
      for (const pageConnection of pageConnections) {
        try {
          console.log(`🔄 Subscribing page ${pageConnection.pageName} (${pageConnection.pageId})`);
          
          const pageStatus = await this.subscribePageToWebhook(
            pageConnection.pageId,
            pageConnection.pageName,
            pageConnection.pageAccessTokenEnc
          );

          if (pageStatus.isSubscribed) {
            result.subscribed.push(pageStatus);
            result.summary.successful++;
            console.log(`✅ Successfully subscribed ${pageConnection.pageName}`);
          } else {
            result.failed.push(pageStatus);
            result.summary.failed++;
            console.log(`❌ Failed to subscribe ${pageConnection.pageName}: ${pageStatus.error}`);
          }

        } catch (pageError) {
          const errorStatus: PageSubscriptionStatus = {
            pageId: pageConnection.pageId,
            pageName: pageConnection.pageName,
            isSubscribed: false,
            subscriptionFields: [],
            lastChecked: new Date(),
            error: pageError instanceof Error ? pageError.message : 'Unknown error'
          };
          
          result.failed.push(errorStatus);
          result.summary.failed++;
          console.log(`❌ Exception subscribing ${pageConnection.pageName}:`, pageError);
        }
      }

      result.success = result.summary.failed === 0;
      
      console.log(`🏁 Webhook subscription complete: ${result.summary.successful}/${result.summary.total} successful`);
      return result;

    } catch (error) {
      console.error('❌ Error in webhook subscription process:', error);
      result.success = false;
      return result;
    }
  }

  /**
   * Subscribe individual page to webhook
   */
  static async subscribePageToWebhook(
    pageId: string,
    pageName: string,
    pageAccessTokenOrEnc: string,
    customFields?: string[]
  ): Promise<PageSubscriptionStatus> {
    try {
      // Handle both encrypted and plain access tokens
      let pageAccessToken: string;
      
      // Check if it's already a plain access token (starts with 'EAA')
      if (pageAccessTokenOrEnc.startsWith('EAA')) {
        pageAccessToken = pageAccessTokenOrEnc;
        console.log(`📡 Using plain access token for ${pageName}`);
      } else {
        // Decrypt the page access token
        const { decrypt } = await import('./encryption');
        pageAccessToken = await decrypt(pageAccessTokenOrEnc);
        console.log(`🔐 Using decrypted access token for ${pageName}`);
      }

      const subscriptionFields = customFields || this.DEFAULT_FIELDS;
      
      // Subscribe to webhook using the page's own access token
      console.log(`📡 Subscribing ${pageName} to webhook with its own access token`);
      const subscriptionResult = await facebookAPI.subscribePageToWebhook(
        pageId,
        pageAccessToken,
        subscriptionFields
      );

      if (subscriptionResult.success) {
        // Update database with subscription status
        await db.pageConnection.update({
          where: { pageId },
          data: {
            subscribed: true
          }
        });

        return {
          pageId,
          pageName,
          isSubscribed: true,
          subscriptionFields,
          lastChecked: new Date()
        };
      } else {
        return {
          pageId,
          pageName,
          isSubscribed: false,
          subscriptionFields: [],
          lastChecked: new Date(),
          error: 'Subscription API returned success: false'
        };
      }

    } catch (error) {
      console.error(`❌ Failed to subscribe page ${pageId}:`, error);
      return {
        pageId,
        pageName,
        isSubscribed: false,
        subscriptionFields: [],
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check webhook subscription status for a page
   */
  static async checkPageSubscriptionStatus(
    pageId: string,
    pageAccessTokenEnc: string
  ): Promise<{ isSubscribed: boolean; fields: string[]; error?: string }> {
    try {
      const { decrypt } = await import('./encryption');
      const pageAccessToken = await decrypt(pageAccessTokenEnc);

      // Check current subscriptions
      const response = await fetch(
        `https://graph.facebook.com/v23.0/${pageId}/subscribed_apps?access_token=${pageAccessToken}`
      );

      if (!response.ok) {
        const error = await response.text();
        return { isSubscribed: false, fields: [], error };
      }

      const data = await response.json();
      
      // Find our app in the subscriptions
      const ourApp = data.data?.find((app: any) => 
        app.id === process.env.FACEBOOK_APP_ID
      );

      if (ourApp) {
        return {
          isSubscribed: true,
          fields: ourApp.subscribed_fields || []
        };
      } else {
        return {
          isSubscribed: false,
          fields: [],
          error: 'App not found in page subscriptions'
        };
      }

    } catch (error) {
      return {
        isSubscribed: false,
        fields: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get subscription status for all company pages
   */
  static async getCompanyPagesSubscriptionStatus(companyId: string): Promise<PageSubscriptionStatus[]> {
    const pageConnections = await db.pageConnection.findMany({
      where: { companyId },
      select: {
        pageId: true,
        pageName: true,
        pageAccessTokenEnc: true,
      }
    });

    const statusPromises = pageConnections.map(async (page) => {
      const status = await this.checkPageSubscriptionStatus(
        page.pageId,
        page.pageAccessTokenEnc
      );

      return {
        pageId: page.pageId,
        pageName: page.pageName,
        isSubscribed: status.isSubscribed,
        subscriptionFields: status.fields,
        lastChecked: new Date(),
        error: status.error
      };
    });

    return await Promise.all(statusPromises);
  }

  /**
   * Resubscribe failed pages
   */
  static async resubscribeFailedPages(companyId: string): Promise<WebhookSubscriptionResult> {
    console.log(`🔄 Resubscribing failed pages for company ${companyId}`);
    
    // First get current status
    const currentStatus = await this.getCompanyPagesSubscriptionStatus(companyId);
    const failedPages = currentStatus.filter(page => !page.isSubscribed);
    
    if (failedPages.length === 0) {
      console.log('✅ All pages are already subscribed');
      return {
        success: true,
        subscribed: currentStatus.filter(p => p.isSubscribed),
        failed: [],
        summary: {
          total: currentStatus.length,
          successful: currentStatus.length,
          failed: 0
        }
      };
    }

    console.log(`🔍 Found ${failedPages.length} unsubscribed pages`);
    
    // Resubscribe only the failed ones
    const result: WebhookSubscriptionResult = {
      success: true,
      subscribed: [...currentStatus.filter(p => p.isSubscribed)], // Keep existing subscribed pages
      failed: [],
      summary: { total: currentStatus.length, successful: 0, failed: 0 }
    };

    for (const failedPage of failedPages) {
      try {
        const pageConnection = await db.pageConnection.findUnique({
          where: { pageId: failedPage.pageId },
          select: { pageAccessTokenEnc: true }
        });

        if (!pageConnection) {
          console.log(`⚠️ Page connection not found for ${failedPage.pageId}`);
          continue;
        }

        const resubscribeResult = await this.subscribePageToWebhook(
          failedPage.pageId,
          failedPage.pageName,
          pageConnection.pageAccessTokenEnc
        );

        if (resubscribeResult.isSubscribed) {
          result.subscribed.push(resubscribeResult);
          result.summary.successful++;
        } else {
          result.failed.push(resubscribeResult);
          result.summary.failed++;
        }

      } catch (error) {
        console.error(`❌ Error resubscribing ${failedPage.pageName}:`, error);
        result.failed.push({
          ...failedPage,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        result.summary.failed++;
      }
    }

    // Add already subscribed pages to successful count
    result.summary.successful += currentStatus.filter(p => p.isSubscribed).length;
    result.success = result.summary.failed === 0;

    console.log(`🏁 Resubscription complete: ${result.summary.successful}/${result.summary.total} successful`);
    return result;
  }

  /**
   * Test webhook connectivity for a page
   */
  static async testWebhookConnectivity(pageId: string): Promise<{ 
    connected: boolean; 
    lastWebhook?: Date;
    error?: string;
  }> {
    try {
      // Check database for recent webhook activity
      const recentMessages = await db.message.findMany({
        where: {
          conversation: {
            pageConnection: {
              pageId
            }
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 1
      });

      if (recentMessages.length > 0) {
        return {
          connected: true,
          lastWebhook: recentMessages[0].createdAt
        };
      } else {
        return {
          connected: false,
          error: 'No webhook activity in the last 24 hours'
        };
      }

    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default FacebookWebhookManager;
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { facebookOAuth } from "@/lib/facebook-oauth";
import FacebookDiagnostics from "@/lib/facebook-diagnostics";
import FacebookWebhookManager from "@/lib/facebook-webhook-manager";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { facebookAPI } from "@/lib/facebook";

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Facebook OAuth callback received");

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Check for OAuth errors
    if (error) {
      console.error("❌ Facebook OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      console.error("❌ No authorization code received");
      return NextResponse.redirect(
        new URL("/dashboard/integrations?error=No authorization code received", request.url)
      );
    }

    // Verify user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error("❌ No user session found");
      return NextResponse.redirect(
        new URL("/auth/login?error=Please login first", request.url)
      );
    }

    try {
      // Exchange code for access token
      console.log("🔄 Exchanging code for access token");
      const tokenResponse = await facebookOAuth.exchangeCodeForToken(code);
      
      // Debug: Check what scopes we actually got
      console.log("🔍 Debug: Checking token permissions");
      const permissionsResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/permissions?access_token=${tokenResponse.access_token}`
      );
      const permissionsData = await permissionsResponse.json();
      console.log("🔍 Debug: Granted permissions:", JSON.stringify(permissionsData, null, 2));
      
      // Get user profile to verify
      console.log("🔄 Getting user profile");
      const profile = await facebookOAuth.getUserProfile(tokenResponse.access_token);
      
      // Get user's Facebook pages
      console.log("🔄 Getting user pages");
      
      // First, let's see what the raw API returns
      console.log("🔍 Debug: Making direct API call to /me/accounts");
      const debugResponse = await fetch(
        `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token,category,tasks&access_token=${tokenResponse.access_token}`
      );
      const debugData = await debugResponse.json();
      console.log("🔍 Debug: Raw Facebook API response:", JSON.stringify(debugData, null, 2));
      
      const pages = await facebookOAuth.getUserPages(tokenResponse.access_token);

      console.log(`✅ Found ${pages.length} manageable pages for user ${profile.name}`);
      console.log("🔍 Debug: Filtered pages:", JSON.stringify(pages, null, 2));

      // Run diagnostics if no pages found
      if (pages.length === 0) {
        console.log('🔍 Running Facebook diagnostics to identify issues...');
        const diagnostic = await FacebookDiagnostics.diagnoseLogin(tokenResponse.access_token);
        const report = FacebookDiagnostics.generateReport(diagnostic);
        console.log(report);
      }

      // Save the pages to database and subscribe to webhooks
      if (pages.length > 0 && session.user.companyId) {
        console.log(`💾 Saving ${pages.length} pages to database for company ${session.user.companyId}...`);
        
        const connectedPages = [];
        const errors = [];
        
        // Generate a verify token for webhook setup
        const verifyToken = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
        
        for (const pageData of pages) {
          try {
            console.log(`🔄 Processing page: ${pageData.name} (${pageData.id})`);
            
            // Get long-lived page access token
            let longLivedToken = pageData.access_token;
            try {
              longLivedToken = await facebookOAuth.getLongLivedPageToken(pageData.access_token);
              console.log(`✅ Got long-lived token for page ${pageData.id}`);
            } catch (tokenError) {
              console.warn(`⚠️ Could not get long-lived token for page ${pageData.id}, using provided token:`, tokenError);
            }
            
            // Fetch page info including profile picture
            console.log(`🖼️ Fetching page info for ${pageData.id}`);
            let profilePictureUrl = null;
            try {
              const pageInfo = await facebookAPI.getPageInfo(longLivedToken);
              profilePictureUrl = pageInfo.picture?.data?.url || null;
              console.log(`✅ Got profile picture for page ${pageData.id}:`, profilePictureUrl ? 'Found' : 'Not found');
            } catch (profileError) {
              console.warn(`⚠️ Could not fetch profile picture for page ${pageData.id}:`, profileError);
            }
            
            // Encrypt tokens
            console.log(`🔐 Encrypting tokens for page ${pageData.id}`);
            const encryptedPageToken = await encrypt(longLivedToken);
            const encryptedVerifyToken = await encrypt(verifyToken);
            
            // Create or update page connection
            console.log(`💾 Saving page connection for ${pageData.id}`);
            const pageConnection = await db.pageConnection.upsert({
              where: { pageId: pageData.id },
              create: {
                companyId: session.user.companyId!,
                pageId: pageData.id,
                pageName: pageData.name,
                pageAccessTokenEnc: encryptedPageToken,
                verifyTokenEnc: encryptedVerifyToken,
                subscribed: false, // Will be updated after webhook subscription
                profilePictureUrl: profilePictureUrl,
              },
              update: {
                pageName: pageData.name,
                pageAccessTokenEnc: encryptedPageToken,
                verifyTokenEnc: encryptedVerifyToken,
                profilePictureUrl: profilePictureUrl,
              },
            });
            
            // Subscribe to webhook events using the enhanced webhook manager
            let subscriptionSuccess = false;
            try {
              console.log(`📡 Subscribing page ${pageData.id} to webhook events`);
              
              const subscriptionResult = await FacebookWebhookManager.subscribePageToWebhook(
                pageData.id,
                pageData.name,
                longLivedToken, // Use the fresh long-lived token
                undefined // Use default fields
              );
              
              subscriptionSuccess = subscriptionResult.isSubscribed;
              
              if (subscriptionSuccess) {
                console.log(`✅ Successfully subscribed ${pageData.name} to webhooks`);
              } else {
                console.log(`❌ Failed to subscribe ${pageData.name}: ${subscriptionResult.error}`);
              }
            } catch (subscribeError) {
              console.warn(`⚠️ Could not subscribe page ${pageData.id} to webhook:`, subscribeError);
              subscriptionSuccess = false;
            }
            
            // Update subscription status in database
            if (subscriptionSuccess) {
              try {
                await db.pageConnection.update({
                  where: { id: pageConnection.id },
                  data: { subscribed: true },
                });
                console.log(`✅ Database updated: page ${pageData.id} marked as subscribed`);
              } catch (dbError) {
                console.warn(`⚠️ Could not update subscription status in database:`, dbError);
              }
            }
            
            connectedPages.push({
              id: pageConnection.id,
              pageId: pageConnection.pageId,
              pageName: pageConnection.pageName,
              subscribed: subscriptionSuccess,
              category: pageData.category,
              profilePictureUrl,
            });
            
            console.log(`✅ Page ${pageData.name} processed successfully`);
          } catch (pageError) {
            console.error(`❌ Failed to process page ${pageData.name}:`, pageError);
            errors.push({
              pageId: pageData.id,
              pageName: pageData.name,
              error: pageError instanceof Error ? pageError.message : "Unknown error",
            });
          }
        }
        
        console.log(`✅ Page processing completed. Success: ${connectedPages.length}, Errors: ${errors.length}`);
        
        // Prepare success message
        const successMessage = `Connected ${connectedPages.length} page${connectedPages.length !== 1 ? 's' : ''} successfully`;
        const errorMessage = errors.length > 0 ? `${errors.length} page${errors.length !== 1 ? 's' : ''} failed to connect` : '';
        
        return NextResponse.redirect(
          new URL(
            `/dashboard/integrations?facebook_success=true&message=${encodeURIComponent(successMessage)}${errorMessage ? `&error=${encodeURIComponent(errorMessage)}` : ''}`,
            request.url
          )
        );
      } else {
        // No pages found, redirect with appropriate message
        return NextResponse.redirect(
          new URL(
            `/dashboard/integrations?facebook_success=true&message=${encodeURIComponent('Facebook login successful but no pages found')}`,
            request.url
          )
        );
      }

    } catch (apiError) {
      console.error("❌ Facebook API error:", apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : "Failed to authenticate with Facebook";
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }

  } catch (error) {
    console.error("❌ OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/integrations?error=Authentication failed", request.url)
    );
  }
}

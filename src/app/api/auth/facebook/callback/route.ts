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
        new URL(`/dashboard/integrations?error=${encodeURIComponent(errorDescription || error)}`, process.env.NEXTAUTH_URL)
      );
    }

    if (!code) {
      console.error("❌ No authorization code received");
      return NextResponse.redirect(
        new URL("/dashboard/integrations?error=No authorization code received", process.env.NEXTAUTH_URL)
      );
    }

    // Verify user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error("❌ No user session found");
      return NextResponse.redirect(
        new URL("/auth/login?error=Please login first", process.env.NEXTAUTH_URL)
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
        `https://graph.facebook.com/v23.0/me/accounts?fields=id,name,access_token,category,tasks,picture,followers_count,fan_count&access_token=${tokenResponse.access_token}`
      );
      const debugData = await debugResponse.json();
      console.log("🔍 Debug: Raw Facebook API response:", JSON.stringify(debugData, null, 2));
      
      let pages = await facebookOAuth.getUserPages(tokenResponse.access_token);

      console.log(`✅ Found ${pages.length} manageable pages for user ${profile.name}`);
      console.log("🔍 Debug: Filtered pages:", JSON.stringify(pages, null, 2));

      // Check which pages are already connected to THIS company
      // We'll include ALL pages (both new and existing) to allow token refresh
      if (session.user.companyId) {
        const existingPageConnections = await db.pageConnection.findMany({
          where: {
            companyId: session.user.companyId,
            pageId: {
              in: pages.map(p => p.id),
            },
          },
          select: {
            pageId: true,
            pageName: true,
          },
        });

        const existingPageIds = new Set(existingPageConnections.map(p => p.pageId));
        const alreadyConnectedPages = pages.filter(p => existingPageIds.has(p.id));
        const newPages = pages.filter(p => !existingPageIds.has(p.id));

        if (alreadyConnectedPages.length > 0) {
          console.log(`ℹ️  ${alreadyConnectedPages.length} page(s) already connected (tokens will be refreshed if selected):`);
          alreadyConnectedPages.forEach(p => {
            console.log(`   - ${p.name} (${p.id})`);
          });
        }

        if (newPages.length > 0) {
          console.log(`✨ ${newPages.length} new page(s) available to connect:`);
          newPages.forEach(p => {
            console.log(`   - ${p.name} (${p.id})`);
          });
        }

        // IMPORTANT: Include ALL pages (both new and existing) to allow token refresh
        // This fixes the issue where only one page has valid token at a time
        console.log(`✅ Sending ${pages.length} page(s) to selector (${newPages.length} new, ${alreadyConnectedPages.length} for refresh)`);
        
        // Mark which pages are already connected so UI can show indicator
        pages = pages.map(p => ({
          ...p,
          alreadyConnected: existingPageIds.has(p.id),
        }));
      }

      // Instead of auto-connecting all pages, redirect to setup page for user to select pages
      // Prepare pages data for selection
      const pagesData = {
        userProfile: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
        },
        pages: pages.map(page => ({
          id: page.id,
          name: page.name,
          category: page.category,
          access_token: page.access_token,
          tasks: page.tasks,
          picture: page.picture?.data?.url || null,
          followers_count: page.followers_count || page.fan_count || 0,
          posts_count: page.published_posts?.summary?.total_count || 0,
          alreadyConnected: (page as any).alreadyConnected || false,
        })),
      };

      console.log(`🔄 Redirecting to page selection with ${pages.length} page(s)`);
      
      console.log("🔍 DEBUG: Pages in OAuth callback:");
      pages.forEach((page, index) => {
        console.log(`  ${index + 1}. ${page.name} (${page.id}) - token length: ${page.access_token.length}`);
      });
      
      const pagesDataString = JSON.stringify(pagesData);
      const urlEncodedData = encodeURIComponent(pagesDataString);
      const urlLength = urlEncodedData.length;
      
      console.log(`📏 URL data length: ${urlLength} characters`);
      if (urlLength > 2000) {
        console.warn(`⚠️ WARNING: URL data is very long (${urlLength} chars) - may cause issues!`);
      }
      
      // Redirect to setup page with pages data for user selection
      return NextResponse.redirect(
        new URL(
          `/dashboard/integrations/facebook/setup?facebook_success=true&pages_data=${urlEncodedData}`,
          process.env.NEXTAUTH_URL
        )
      );

      // Run diagnostics if no pages found
      if (pages.length === 0) {
        console.log('🔍 Running Facebook diagnostics to identify issues...');
        const diagnostic = await FacebookDiagnostics.diagnoseLogin(tokenResponse.access_token);
        const report = FacebookDiagnostics.generateReport(diagnostic);
        console.log(report);
        
        // Redirect to manage page with no pages found message
        return NextResponse.redirect(
          new URL(
            `/dashboard/integrations/facebook/setup?error=${encodeURIComponent('No Facebook pages found with manage permissions')}`,
            process.env.NEXTAUTH_URL
          )
        );
      }

      // OLD CODE: Auto-connecting all pages (THIS WAS THE BUG!)
      // The code below has been disabled - now we redirect to page selection instead
      /*
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

            console.log(`💾 Saving page connection for ${pageData.id}`);
            console.log(`🏢 User's current company: ${session.user.companyId}`);
            console.log(`📱 Facebook Page ID: ${pageData.id}`);

            // Check if this Facebook page is already connected to another company
            const existingPageConnection = await db.pageConnection.findFirst({
              where: {
                pageId: pageData.id,
                NOT: {
                  companyId: session.user.companyId || undefined, // Different company
                },
              },
              select: {
                id: true,
                companyId: true,
                pageName: true,
              },
            });

            if (existingPageConnection) {
              console.error(`❌ Facebook page ${pageData.name} (ID: ${pageData.id}) is already connected to another company (${existingPageConnection.companyId})`);
              console.error(`❌ Current user's company: ${session.user.companyId}`);
              errors.push({
                pageId: pageData.id,
                pageName: pageData.name,
                error: "This Facebook page is already connected to another company",
              });
              continue; // Skip this page and continue with others
            }

            console.log(`✅ No duplicate found, proceeding to save...`);
            
            // Create or update page connection
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
            `/dashboard/integrations/facebook?facebook_success=true&message=${encodeURIComponent(successMessage)}${errorMessage ? `&error=${encodeURIComponent(errorMessage)}` : ''}`,
            process.env.NEXTAUTH_URL
          )
        );
      } else {
        // No pages found, redirect with appropriate message
        return NextResponse.redirect(
          new URL(
            `/dashboard/integrations/facebook?facebook_success=true&message=${encodeURIComponent('Facebook login successful but no pages found')}`,
            process.env.NEXTAUTH_URL
          )
        );
      }
      */
      // END OF DISABLED AUTO-CONNECT CODE

    } catch (apiError) {
      console.error("❌ Facebook API error:", apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : "Failed to authenticate with Facebook";
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(errorMessage)}`, process.env.NEXTAUTH_URL)
      );
    }

  } catch (error) {
    console.error("❌ OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/integrations?error=Authentication failed", process.env.NEXTAUTH_URL)
    );
  }
}

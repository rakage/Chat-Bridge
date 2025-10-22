import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Facebook Instagram callback received");

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("❌ Facebook OAuth error:", error);
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/dashboard/integrations?error=No authorization code received", request.url)
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.redirect(
        new URL("/auth/login?error=Please login first", request.url)
      );
    }

    try {
      // Exchange code for Facebook access token
      console.log("🔄 Exchanging code for Facebook access token");
      const tokenResponse = await fetch("https://graph.facebook.com/v18.0/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: process.env.FACEBOOK_APP_ID!,
          client_secret: process.env.FACEBOOK_APP_SECRET!,
          redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/facebook/instagram-callback`,
          code: code,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error("❌ Facebook token exchange failed:", error);
        throw new Error("Failed to get Facebook access token");
      }

      const tokenData = await tokenResponse.json();
      const facebookAccessToken = tokenData.access_token;
      
      console.log("✅ Facebook access token obtained");

      // Get Facebook Pages with Instagram Business Accounts
      console.log("🔄 Getting Facebook Pages with Instagram Business Accounts");
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,name,username,profile_picture_url,account_type,media_count}&access_token=${facebookAccessToken}`
      );

      if (!pagesResponse.ok) {
        const error = await pagesResponse.text();
        console.error("❌ Failed to get Facebook pages:", error);
        throw new Error("Failed to get Facebook pages");
      }

      const pagesData = await pagesResponse.json();
      console.log("📄 Facebook Pages response:", JSON.stringify(pagesData, null, 2));

      const instagramAccounts = [];
      
      // Find Instagram Business Accounts
      if (pagesData.data && pagesData.data.length > 0) {
        for (const page of pagesData.data) {
          if (page.instagram_business_account) {
            const igAccount = page.instagram_business_account;
            
            console.log(`✅ Found Instagram Business Account: @${igAccount.username}`);
            console.log(`   🆔 CORRECT Business Account ID: ${igAccount.id}`);
            console.log(`   🖼️ Profile Picture: ${igAccount.profile_picture_url ? 'Available' : 'None'}`);
            
            instagramAccounts.push({
              userProfile: {
                id: igAccount.id, // This is the CORRECT webhook-compatible ID!
                name: igAccount.name,
                username: igAccount.username,
                profile_picture_url: igAccount.profile_picture_url,
                account_type: igAccount.account_type || 'BUSINESS',
                media_count: igAccount.media_count || 0
              },
              pageAccessToken: page.access_token, // Store page token for API calls
              pageId: page.id,
              pageName: page.name
            });
          }
        }
      }

      if (instagramAccounts.length === 0) {
        console.error("❌ No Instagram Business Accounts found");
        return NextResponse.redirect(
          new URL("/dashboard/integrations?error=No Instagram Business Accounts found. Please connect your Instagram account to a Facebook Page.", request.url)
        );
      }

      console.log(`🎉 Found ${instagramAccounts.length} Instagram Business Account(s)`);

      // If multiple accounts, let user choose. For now, we'll take the first one.
      const selectedAccount = instagramAccounts[0];
      
      const instagramData = encodeURIComponent(JSON.stringify({
        userProfile: selectedAccount.userProfile,
        accessToken: selectedAccount.pageAccessToken, // Use page token for API calls
        pageId: selectedAccount.pageId,
        pageName: selectedAccount.pageName,
        mediaCount: selectedAccount.userProfile.media_count,
        conversationsCount: 0, // We'll get this later
        messagingEnabled: true,
        source: 'facebook_oauth' // Mark the source
      }));

      return NextResponse.redirect(
        new URL(`/dashboard/integrations?instagram_success=true&instagram_data=${instagramData}`, request.url)
      );

    } catch (apiError) {
      console.error("❌ Facebook API error:", apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : "Failed to connect Instagram via Facebook";
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(errorMessage)}`, request.url)
      );
    }

  } catch (error) {
    console.error("❌ Facebook Instagram callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/integrations?error=Instagram connection failed", request.url)
    );
  }
}
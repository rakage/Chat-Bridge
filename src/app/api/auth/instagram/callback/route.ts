import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InstagramGraphOAuth } from "@/lib/instagram-graph-oauth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Instagram OAuth callback received");

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    const baseUrl = process.env.NEXTAUTH_URL || request.url;

    // Check for OAuth errors
    if (error) {
      console.error("❌ Instagram OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(errorDescription || error)}`, baseUrl)
      );
    }

    if (!code) {
      console.error("❌ No authorization code received");
      return NextResponse.redirect(
        new URL("/dashboard/integrations?error=No authorization code received", baseUrl)
      );
    }

    // Verify user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error("❌ No user session found");
      return NextResponse.redirect(
        new URL("/auth/login?error=Please login first", baseUrl)
      );
    }

    try {
      const instagramOAuth = new InstagramGraphOAuth();
      
      // Exchange code for short-lived access token
      console.log("🔄 Exchanging code for short-lived access token");
      const shortTokenResponse = await instagramOAuth.exchangeCodeForToken(code);
      
      // Exchange for long-lived token (60 days) - recommended by Instagram
      console.log("🔄 Exchanging for long-lived access token");
      const longTokenResponse = await instagramOAuth.exchangeForLongLivedToken(shortTokenResponse.access_token);
      
      // Get user profile using long-lived token
      console.log("🔄 Getting Instagram Business profile");
      const profile = await instagramOAuth.getUserProfile(longTokenResponse.access_token);
      
      // Try to get conversations
      console.log("🔄 Getting Instagram conversations");
      let conversations = [];
      try {
        const conversationsResponse = await instagramOAuth.getConversations(longTokenResponse.access_token);
        conversations = conversationsResponse.data || [];
      } catch (conversationError) {
        console.log("⚠️ Could not fetch conversations (normal for new accounts):", conversationError);
      }
      
      console.log(`✅ Instagram Business Login successful for @${profile.username}`);
      console.log(`📆 Account: ${profile.account_type || 'BUSINESS'}, Media count: ${profile.media_count || 0}`);
      console.log(`💬 Found ${conversations.length} conversations`);
      console.log(`🕐 Long-lived token expires in ${Math.round(longTokenResponse.expires_in / 86400)} days`);
      
      // Get user's company
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true }
      });

      if (!user?.companyId) {
        console.error("❌ User has no company associated");
        return NextResponse.redirect(
          new URL("/dashboard/integrations?error=Please create or join a company first", baseUrl)
        );
      }

      // Encrypt access token
      const encryptedToken = await encrypt(longTokenResponse.access_token);

      // Save or update Instagram connection
      console.log("💾 Saving Instagram connection to database...");
      const connection = await db.instagramConnection.upsert({
        where: {
          companyId_instagramUserId: {
            companyId: user.companyId,
            instagramUserId: profile.id,
          },
        },
        create: {
          instagramUserId: profile.id,
          username: profile.username,
          accessTokenEnc: encryptedToken,
          companyId: user.companyId,
          profilePictureUrl: profile.profile_picture_url || null,
          accountType: profile.account_type || "BUSINESS",
          mediaCount: profile.media_count || 0,
          conversationsCount: conversations.length,
          messagingEnabled: true,
        },
        update: {
          username: profile.username,
          accessTokenEnc: encryptedToken,
          profilePictureUrl: profile.profile_picture_url || null,
          accountType: profile.account_type || "BUSINESS",
          mediaCount: profile.media_count || 0,
          conversationsCount: conversations.length,
        },
      });

      console.log(`✅ Instagram connection saved: @${connection.username} (ID: ${connection.id})`);

      return NextResponse.redirect(
        new URL(`/dashboard/integrations/instagram/manage?success=true`, baseUrl)
      );

    } catch (apiError) {
      console.error("❌ Instagram API error:", apiError);
      const errorMessage = apiError instanceof Error ? apiError.message : "Failed to authenticate with Instagram";
      return NextResponse.redirect(
        new URL(`/dashboard/integrations?error=${encodeURIComponent(errorMessage)}`, baseUrl)
      );
    }

  } catch (error) {
    console.error("❌ Instagram OAuth callback error:", error);
    const baseUrl = process.env.NEXTAUTH_URL || request.url;
    return NextResponse.redirect(
      new URL("/dashboard/integrations?error=Authentication failed", baseUrl)
    );
  }
}

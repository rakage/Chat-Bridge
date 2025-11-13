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
      
      // Get user's current company (use currentCompanyId for multi-company support)
      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: { 
          id: true, 
          companyId: true,           // Legacy field
          currentCompanyId: true     // New field for company switching
        }
      });

      // Use currentCompanyId if available, fallback to legacy companyId
      const userCompanyId = user?.currentCompanyId || user?.companyId;

      if (!userCompanyId) {
        console.error("❌ User has no company associated");
        return NextResponse.redirect(
          new URL("/dashboard/integrations?error=Please create or join a company first", baseUrl)
        );
      }

      // Encrypt access token
      const encryptedToken = await encrypt(longTokenResponse.access_token);

      console.log(`💾 Saving Instagram connection for user ${user.id}: @${profile.username}`);
      console.log(`🏢 User's current company: ${userCompanyId} (currentCompanyId: ${user.currentCompanyId}, legacy companyId: ${user.companyId})`);
      console.log(`📱 Instagram user ID: ${profile.id}`);

      // Check if this Instagram account is already connected to another company
      const existingConnection = await db.instagramConnection.findFirst({
        where: {
          instagramUserId: profile.id,
          NOT: {
            companyId: userCompanyId, // Different company
          },
          isActive: true,
        },
        select: {
          id: true,
          companyId: true,
          username: true,
        },
      });

      if (existingConnection) {
        console.error(`❌ Instagram account @${profile.username} (ID: ${profile.id}) is already connected to another company (${existingConnection.companyId})`);
        console.error(`❌ Current user's company: ${userCompanyId}`);
        return NextResponse.redirect(
          new URL("/dashboard/integrations/instagram/setup?error=" + encodeURIComponent("This Instagram account is already connected to another company"), baseUrl)
        );
      }

      console.log(`✅ No duplicate found, proceeding to save...`);

      // Save or update Instagram connection
      const connection = await db.instagramConnection.upsert({
        where: {
          companyId_instagramUserId: {
            companyId: userCompanyId,
            instagramUserId: profile.id,
          },
        },
        create: {
          instagramUserId: profile.id,
          username: profile.username,
          accessTokenEnc: encryptedToken,
          companyId: userCompanyId,
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
        new URL(`/dashboard/integrations/instagram?success=true`, baseUrl)
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

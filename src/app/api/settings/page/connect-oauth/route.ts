import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { facebookOAuth } from "@/lib/facebook-oauth";
import { facebookAPI } from "@/lib/facebook";
import { z } from "zod";

const pageConnectOAuthSchema = z.object({
  pages: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    category: z.string(),
    access_token: z.string().min(1),
  })).min(1),
  verifyToken: z.string().optional(), // Optional for OAuth flow
});

export async function POST(request: NextRequest) {
  try {
    console.log("🔌 OAuth page connect request received");

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageSettings(session.user.role)) {
      console.error("❌ User doesn't have permission:", session.user.role);
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!session.user.companyId) {
      console.error("❌ No company associated with user");
      return NextResponse.json(
        { error: "No company associated" },
        { status: 400 }
      );
    }

    const body = await request.json();
    console.log("📝 Request body received:", {
      pageCount: body.pages?.length || 0,
      hasVerifyToken: !!body.verifyToken,
    });
    
    const { pages, verifyToken } = pageConnectOAuthSchema.parse(body);

    // Generate a default verify token if not provided
    const finalVerifyToken = verifyToken || `verify_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    const connectedPages = [];
    const errors = [];

    // Connect each page
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
        console.log(`🖼️ Fetching page info and profile picture for ${pageData.id}`);
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
        const encryptedVerifyToken = await encrypt(finalVerifyToken);

        // Create or update page connection
        console.log(`💾 Saving page connection for ${pageData.id}`);
        const pageConnection = await db.pageConnection.upsert({
          where: { pageId: pageData.id },
          create: {
            companyId: session.user.companyId,
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

        // Auto-subscribe to webhook events
        let subscriptionSuccess = false;
        const skipAutoSubscription = process.env.SKIP_AUTO_SUBSCRIPTION === "true";
        
        if (skipAutoSubscription) {
          console.log(`🔧 Skipping auto-subscription for page ${pageData.id} (SKIP_AUTO_SUBSCRIPTION=true)`);
          subscriptionSuccess = false;
        } else {
          try {
            console.log(`🔔 Auto-subscribing page ${pageData.id} to webhook events`);
            await facebookAPI.subscribePageToWebhook(longLivedToken, [
              "messages",
              "messaging_postbacks", 
              "message_deliveries",
              "message_reads"
            ]);
            
            subscriptionSuccess = true;
            console.log(`✅ Page ${pageData.id} auto-subscribed to webhook events`);
          } catch (subscribeError) {
            console.warn(`⚠️ Could not auto-subscribe page ${pageData.id} to webhook:`, subscribeError);
            // Don't fail the entire connection if webhook subscription fails
            subscriptionSuccess = false;
          }
        }
        
        // Update subscription status in database if auto-subscription was successful
        if (subscriptionSuccess) {
          try {
            // Update subscription status (trigger conflict resolved)
            await db.pageConnection.update({
              where: { id: pageConnection.id },
              data: { subscribed: true },
            });
            console.log(`✅ Database updated: page ${pageData.id} marked as subscribed`);
          } catch (dbError) {
            console.warn(`⚠️ Could not update subscription status in database:`, dbError);
            // Don't fail the entire flow if database update fails
          }
        }

        connectedPages.push({
          id: pageConnection.id,
          pageId: pageConnection.pageId,
          pageName: pageConnection.pageName,
          subscribed: subscriptionSuccess, // Use actual subscription result
          category: pageData.category,
          autoSubscribed: subscriptionSuccess,
        });

        console.log(`✅ Page ${pageData.name} connected successfully`);
      } catch (pageError) {
        console.error(`❌ Failed to connect page ${pageData.name}:`, pageError);
        errors.push({
          pageId: pageData.id,
          pageName: pageData.name,
          error: pageError instanceof Error ? pageError.message : "Unknown error",
        });
      }
    }

    console.log(`✅ OAuth connect completed. Success: ${connectedPages.length}, Errors: ${errors.length}`);

    return NextResponse.json({
      success: connectedPages.length > 0,
      message: `Connected ${connectedPages.length} page${connectedPages.length !== 1 ? 's' : ''} successfully`,
      connectedPages,
      errors: errors.length > 0 ? errors : undefined,
      verifyToken: finalVerifyToken, // Return for webhook setup
    });
  } catch (error) {
    console.error("❌ OAuth connect pages error:", error);

    if (error instanceof z.ZodError) {
      console.error("❌ Validation error:", error.errors);
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to connect pages" },
      { status: 500 }
    );
  }
}

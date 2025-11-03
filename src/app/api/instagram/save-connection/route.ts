import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  try {
    console.log("💾 Instagram save connection request received");

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userProfile, accessToken, userId, mediaCount, conversationsCount, messagingEnabled } = await request.json();

    if (!userProfile || !accessToken) {
      console.error("❌ Missing required Instagram data");
      return NextResponse.json(
        { error: "Missing userProfile or accessToken" },
        { status: 400 }
      );
    }

    console.log(`💾 Saving Instagram connection for user ${session.user.id}: @${userProfile.username}`);
    console.log(`🏢 User's current company: ${session.user.companyId}`);
    console.log(`📱 Instagram user ID: ${userProfile.id}`);

    // Check if this Instagram account is already connected to another company
    const existingConnection = await db.instagramConnection.findFirst({
      where: {
        instagramUserId: userProfile.id,
        NOT: {
          companyId: session.user.companyId || undefined, // Different company
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
      console.error(`❌ Instagram account @${userProfile.username} (ID: ${userProfile.id}) is already connected to another company (${existingConnection.companyId})`);
      console.error(`❌ Current user's company: ${session.user.companyId}`);
      return NextResponse.json(
        { error: "This Instagram account is already connected to another company" },
        { status: 400 }
      );
    }

    console.log(`✅ No duplicate found, proceeding to save...`);

    // Save to database using Prisma (upsert to handle updates)
    const instagramConnection = await db.instagramConnection.upsert({
      where: {
        companyId_instagramUserId: {
          companyId: session.user.companyId!,
          instagramUserId: userProfile.id,
        },
      },
      update: {
        username: userProfile.username,
        displayName: userProfile.name,
        accessTokenEnc: await encrypt(accessToken),
        profileData: userProfile,
        mediaCount: mediaCount || 0,
        conversationsCount: conversationsCount || 0,
        messagingEnabled: messagingEnabled || false,
        profilePictureUrl: userProfile.profile_picture_url || null,
        accountType: userProfile.account_type || 'business',
        isActive: true,
      },
      create: {
        companyId: session.user.companyId!,
        instagramUserId: userProfile.id,
        username: userProfile.username,
        displayName: userProfile.name,
        accessTokenEnc: await encrypt(accessToken),
        profileData: userProfile,
        mediaCount: mediaCount || 0,
        conversationsCount: conversationsCount || 0,
        messagingEnabled: messagingEnabled || false,
        profilePictureUrl: userProfile.profile_picture_url || null,
        accountType: userProfile.account_type || 'business',
        isActive: true,
      },
    });

    console.log("📊 Instagram connection saved to database:", {
      id: instagramConnection.id,
      username: instagramConnection.username,
      companyId: instagramConnection.companyId
    });

    return NextResponse.json({
      success: true,
      message: `Instagram account @${userProfile.username} saved successfully`,
      connection: {
        id: instagramConnection.id,
        username: instagramConnection.username,
        displayName: instagramConnection.displayName,
        mediaCount: instagramConnection.mediaCount,
        conversationsCount: instagramConnection.conversationsCount,
        messagingEnabled: instagramConnection.messagingEnabled,
        accountType: instagramConnection.accountType
      }
    });

  } catch (error) {
    console.error("❌ Error saving Instagram connection:", error);
    return NextResponse.json(
      { error: "Failed to save Instagram connection" },
      { status: 500 }
    );
  }
}
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

    // Here you would typically save to your database
    // For now, we'll use a simple file-based storage or in-memory solution
    // In a real app, you'd use Prisma/database:
    /*
    const instagramConnection = await prisma.instagramConnection.upsert({
      where: { 
        userId_companyId: {
          userId: session.user.id,
          companyId: session.user.companyId!
        }
      },
      update: {
        instagramUserId: userProfile.id,
        username: userProfile.username,
        accessToken: await encrypt(accessToken), // Encrypt the token
        profileData: userProfile,
        mediaCount: mediaCount || 0,
        conversationsCount: conversationsCount || 0,
        messagingEnabled: messagingEnabled || false,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        userId: session.user.id,
        companyId: session.user.companyId!,
        instagramUserId: userProfile.id,
        username: userProfile.username,
        accessToken: await encrypt(accessToken), // Encrypt the token
        profileData: userProfile,
        mediaCount: mediaCount || 0,
        conversationsCount: conversationsCount || 0,
        messagingEnabled: messagingEnabled || false,
        isActive: true,
      }
    });
    */

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
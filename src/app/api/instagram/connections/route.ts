import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log("📥 Instagram connections request received");

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`📊 Loading Instagram connections for user ${session.user.id}`);

    // Here you would typically fetch from your database
    // For now, we'll return mock data or implement a simple storage solution
    // In a real app, you'd use Prisma/database:
    /*
    const instagramConnections = await prisma.instagramConnection.findMany({
      where: {
        userId: session.user.id,
        companyId: session.user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        instagramUserId: true,
        username: true,
        profileData: true,
        mediaCount: true,
        conversationsCount: true,
        messagingEnabled: true,
        connectedAt: true,
        // Don't return accessToken for security
      }
    });
    */

    // Get Instagram connections from database
    const instagramConnections = await db.instagramConnection.findMany({
      where: {
        companyId: session.user.companyId!,
        isActive: true,
      },
      select: {
        id: true,
        instagramUserId: true,
        username: true,
        displayName: true,
        profileData: true,
        mediaCount: true,
        conversationsCount: true,
        messagingEnabled: true,
        profilePictureUrl: true,
        accountType: true,
        createdAt: true,
        updatedAt: true,
        // Don't include accessTokenEnc for security
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Found ${instagramConnections.length} Instagram connections`);
    
    // Format connections for frontend (similar to PageConnection structure)
    const formattedConnections = instagramConnections.map(conn => ({
      id: conn.id,
      instagramUserId: conn.instagramUserId,
      username: conn.username,
      displayName: conn.displayName,
      profileData: conn.profileData,
      mediaCount: conn.mediaCount,
      conversationsCount: conn.conversationsCount,
      messagingEnabled: conn.messagingEnabled,
      profilePictureUrl: conn.profilePictureUrl,
      accountType: conn.accountType,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
      // Add webhookConnected for frontend compatibility (Instagram doesn't use webhooks the same way)
      webhookConnected: conn.messagingEnabled
    }));

    return NextResponse.json({
      success: true,
      connections: formattedConnections
    });

  } catch (error) {
    console.error("❌ Error loading Instagram connections:", error);
    return NextResponse.json(
      { error: "Failed to load Instagram connections" },
      { status: 500 }
    );
  }
}
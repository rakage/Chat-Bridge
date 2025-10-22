import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!session.user.companyId) {
      return NextResponse.json(
        { error: "No company associated" },
        { status: 400 }
      );
    }

    // Get Instagram connections for the user's company
    const instagramConnections = await db.instagramConnection.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        instagramUserId: true,
        username: true,
        displayName: true,
        profilePictureUrl: true,
        messagingEnabled: true,
        mediaCount: true,
        conversationsCount: true,
        accountType: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Map messagingEnabled to webhookConnected for frontend compatibility
    const mappedConnections = instagramConnections.map((connection) => ({
      ...connection,
      webhookConnected: connection.messagingEnabled,
      // Use username as display name for consistency with page connections
      pageName: `@${connection.username}`,
      pageId: connection.instagramUserId,
    }));

    return NextResponse.json({
      instagramConnections: mappedConnections,
    });
  } catch (error) {
    console.error("Error fetching Instagram connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch Instagram connections" },
      { status: 500 }
    );
  }
}
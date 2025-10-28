import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

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

    // Get page connections for the user's company
    const pageConnections = await db.pageConnection.findMany({
      where: {
        companyId: session.user.companyId,
      },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        subscribed: true,
        profilePictureUrl: true,
        pageAccessTokenEnc: true, // Need this to fetch fresh profile
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Always fetch fresh profile pictures from Facebook API to avoid expired URLs
    const mappedConnectionsPromises = pageConnections.map(async (connection) => {
      let freshProfilePictureUrl = connection.profilePictureUrl;
      
      try {
        // Fetch fresh profile picture from Facebook API
        const accessToken = await decrypt(connection.pageAccessTokenEnc);
        console.log(`🔄 Fetching fresh Facebook page picture for ${connection.pageName}`);
        
        const response = await fetch(
          `https://graph.facebook.com/v18.0/${connection.pageId}?fields=picture{url}&access_token=${accessToken}`
        );
        
        if (response.ok) {
          const data = await response.json();
          freshProfilePictureUrl = data.picture?.data?.url || connection.profilePictureUrl;
          console.log(`✅ Fresh profile picture fetched for ${connection.pageName}`);
          
          // Update database with fresh URL (optional, but good for fallback)
          await db.pageConnection.update({
            where: { id: connection.id },
            data: { profilePictureUrl: freshProfilePictureUrl },
          });
        } else {
          console.warn(`⚠️ Failed to fetch fresh profile for ${connection.pageName}, using cached URL`);
        }
      } catch (error) {
        console.error(`❌ Error fetching fresh profile for ${connection.pageName}:`, error);
        // Fall back to cached URL
      }
      
      return {
        id: connection.id,
        pageId: connection.pageId,
        pageName: connection.pageName,
        subscribed: connection.subscribed,
        profilePictureUrl: freshProfilePictureUrl, // Use fresh URL
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        webhookConnected: connection.subscribed,
      };
    });
    
    const mappedConnections = await Promise.all(mappedConnectionsPromises);

    return NextResponse.json({
      pageConnections: mappedConnections,
    });
  } catch (error) {
    console.error("Error fetching page connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch page connections" },
      { status: 500 }
    );
  }
}

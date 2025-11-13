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
        followersCount: true,
        conversationsCount: true,
        messagingEnabled: true,
        profilePictureUrl: true,
        accountType: true,
        createdAt: true,
        updatedAt: true,
        accessTokenEnc: true, // Need this to fetch fresh profile
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Found ${instagramConnections.length} Instagram connections`);
    
    // Always fetch fresh profile pictures from Instagram API to avoid expired URLs
    const { decrypt } = await import("@/lib/encryption");
    const formattedConnectionsPromises = instagramConnections.map(async (conn) => {
      let freshProfilePictureUrl = conn.profilePictureUrl;
      
      try {
        // Fetch fresh profile data from Instagram API
        const accessToken = await decrypt(conn.accessTokenEnc);
        console.log(`🔄 Fetching fresh Instagram profile picture for @${conn.username}`);
        
        const response = await fetch(
          `https://graph.instagram.com/me?fields=id,username,account_type,media_count,followers_count,profile_picture_url&access_token=${accessToken}`
        );
        
        if (response.ok) {
          const freshData = await response.json();
          freshProfilePictureUrl = freshData.profile_picture_url || conn.profilePictureUrl;
          const freshMediaCount = freshData.media_count || conn.mediaCount;
          const freshFollowersCount = freshData.followers_count || conn.followersCount || 0;
          console.log(`✅ Fresh profile data fetched for @${conn.username}`);
          
          // Update database with fresh data
          await db.instagramConnection.update({
            where: { id: conn.id },
            data: { 
              profilePictureUrl: freshProfilePictureUrl,
              mediaCount: freshMediaCount,
              followersCount: freshFollowersCount,
            },
          });
          
          // Update connection object with fresh data
          conn.mediaCount = freshMediaCount;
          (conn as any).followersCount = freshFollowersCount;
        } else {
          console.warn(`⚠️ Failed to fetch fresh profile for @${conn.username}, using cached data`);
        }
      } catch (error) {
        console.error(`❌ Error fetching fresh profile for @${conn.username}:`, error);
        // Fall back to cached URL
      }
      
      return {
        id: conn.id,
        instagramUserId: conn.instagramUserId,
        username: conn.username,
        displayName: conn.displayName,
        profileData: conn.profileData,
        mediaCount: conn.mediaCount,
        followersCount: (conn as any).followersCount || 0,
        conversationsCount: conn.conversationsCount,
        messagingEnabled: conn.messagingEnabled,
        profilePictureUrl: freshProfilePictureUrl, // Use fresh URL
        accountType: conn.accountType,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt,
        webhookConnected: conn.messagingEnabled
      };
    });
    
    const formattedConnections = await Promise.all(formattedConnectionsPromises);

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
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    console.log("📥 Telegram connections request received");

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.companyId) {
      console.error("❌ User has no company");
      return NextResponse.json({ error: "User must belong to a company" }, { status: 400 });
    }

    console.log(`📊 Loading Telegram connections for company ${session.user.companyId}`);

    // Get Telegram connections from database
    const telegramConnections = await db.telegramConnection.findMany({
      where: {
        companyId: session.user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        botId: true,
        botUsername: true,
        botName: true,
        profilePictureUrl: true,
        webhookUrl: true,
        webhookSet: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        // Don't include botTokenEnc for security
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    console.log(`📊 Found ${telegramConnections.length} Telegram connections`);
    
    // Format connections for frontend
    const formattedConnections = telegramConnections.map(conn => ({
      id: conn.id,
      botId: conn.botId,
      botUsername: conn.botUsername,
      botName: conn.botName,
      profilePictureUrl: conn.profilePictureUrl,
      webhookUrl: conn.webhookUrl,
      webhookSet: conn.webhookSet,
      webhookConnected: conn.webhookSet, // For frontend compatibility
      isActive: conn.isActive,
      createdAt: conn.createdAt,
      updatedAt: conn.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      connections: formattedConnections
    });

  } catch (error) {
    console.error("❌ Error loading Telegram connections:", error);
    return NextResponse.json(
      { error: "Failed to load Telegram connections" },
      { status: 500 }
    );
  }
}

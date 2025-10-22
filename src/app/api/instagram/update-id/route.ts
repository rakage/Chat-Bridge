import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    console.log("🔧 Instagram ID update request received");

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow OWNER and ADMIN to update IDs
    if (!["OWNER", "ADMIN"].includes(session.user.role)) {
      console.error("❌ Insufficient permissions");
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { username, newInstagramUserId, reason } = await request.json();

    if (!username || !newInstagramUserId) {
      console.error("❌ Missing required data");
      return NextResponse.json(
        { error: "Missing username or newInstagramUserId" },
        { status: 400 }
      );
    }

    console.log(`🔧 Updating Instagram ID for @${username} to ${newInstagramUserId}`);
    console.log(`📝 Reason: ${reason || 'Manual update'}`);

    // Find the existing connection
    const existingConnection = await db.instagramConnection.findFirst({
      where: {
        username: username,
        companyId: session.user.companyId!,
        isActive: true,
      },
    });

    if (!existingConnection) {
      console.error(`❌ No active Instagram connection found for @${username}`);
      return NextResponse.json(
        { error: `No active Instagram connection found for @${username}` },
        { status: 404 }
      );
    }

    const oldId = existingConnection.instagramUserId;

    // Update the Instagram User ID
    const updatedConnection = await db.instagramConnection.update({
      where: {
        id: existingConnection.id,
      },
      data: {
        instagramUserId: newInstagramUserId,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Updated Instagram connection for @${username}:`);
    console.log(`   Old ID: ${oldId}`);
    console.log(`   New ID: ${newInstagramUserId}`);

    return NextResponse.json({
      success: true,
      message: `Instagram ID updated for @${username}`,
      update: {
        username: username,
        oldInstagramUserId: oldId,
        newInstagramUserId: newInstagramUserId,
        reason: reason || 'Manual update',
        updatedAt: updatedConnection.updatedAt,
      }
    });

  } catch (error) {
    console.error("❌ Error updating Instagram ID:", error);
    return NextResponse.json(
      { error: "Failed to update Instagram ID" },
      { status: 500 }
    );
  }
}
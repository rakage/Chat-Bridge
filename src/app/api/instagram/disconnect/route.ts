import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    console.log("🔌 Instagram disconnect request received");

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { instagramUserId } = await request.json();

    if (!instagramUserId) {
      console.error("❌ Missing Instagram user ID");
      return NextResponse.json(
        { error: "Missing instagramUserId" },
        { status: 400 }
      );
    }

    console.log(`🔌 Disconnecting Instagram account ${instagramUserId} for company ${session.user.companyId}`);

    // First check if the connection exists and belongs to this company
    const existingConnection = await db.instagramConnection.findUnique({
      where: {
        companyId_instagramUserId: {
          companyId: session.user.companyId!,
          instagramUserId: instagramUserId,
        },
      },
    });

    if (!existingConnection) {
      console.error("❌ Instagram connection not found or doesn't belong to this company");
      return NextResponse.json(
        { error: "Instagram connection not found" },
        { status: 404 }
      );
    }

    // Delete all conversations associated with this Instagram connection
    await db.conversation.deleteMany({
      where: {
        instagramConnectionId: existingConnection.id,
      },
    });

    // Delete the Instagram connection
    await db.instagramConnection.delete({
      where: {
        id: existingConnection.id,
      },
    });

    console.log("✅ Instagram connection disconnected successfully");

    return NextResponse.json({
      success: true,
      message: `Instagram account @${existingConnection.username} disconnected successfully`,
    });

  } catch (error) {
    console.error("❌ Error disconnecting Instagram account:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Instagram account" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import { facebookAPI } from "@/lib/facebook";
import { decrypt } from "@/lib/encryption";
import { z } from "zod";

const pageDisconnectSchema = z.object({
  pageId: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    console.log("🔌 Page disconnect request received");

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
      pageId: body.pageId,
    });
    
    const { pageId } = pageDisconnectSchema.parse(body);

    // Find the page connection
    const pageConnection = await db.pageConnection.findFirst({
      where: {
        pageId: pageId,
        companyId: session.user.companyId,
      },
    });

    if (!pageConnection) {
      console.error("❌ Page connection not found");
      return NextResponse.json(
        { error: "Page connection not found" },
        { status: 404 }
      );
    }

    // Try to unsubscribe from Facebook webhook if the page is currently subscribed
    if (pageConnection.subscribed) {
      try {
        console.log("🔄 Attempting to unsubscribe from Facebook webhook");
        const decryptedToken = await decrypt(pageConnection.pageAccessTokenEnc);
        await facebookAPI.unsubscribePageFromWebhook(decryptedToken);
        console.log("✅ Successfully unsubscribed from Facebook webhook");
      } catch (error) {
        console.warn("⚠️ Could not unsubscribe from Facebook webhook:", error);
        // Continue with disconnection even if webhook unsubscription fails
      }
    }

    // Delete all related conversations and messages (cascade delete should handle this)
    console.log("🗑️ Deleting page connection and related data");
    
    await db.pageConnection.delete({
      where: {
        id: pageConnection.id,
      },
    });

    console.log("✅ Page connection deleted successfully:", pageId);

    return NextResponse.json({
      success: true,
      message: "Page disconnected successfully",
      pageId: pageId,
    });
  } catch (error) {
    console.error("❌ Disconnect page error:", error);

    if (error instanceof z.ZodError) {
      console.error("❌ Validation error:", error.errors);
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to disconnect page" },
      { status: 500 }
    );
  }
}

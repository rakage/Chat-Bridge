import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Mark a conversation as read (reset unread count to 0)
 * 
 * This endpoint should be called when:
 * - Agent opens a conversation
 * - Agent views conversation messages
 * - Agent sends a reply
 * 
 * The unread count is automatically managed by database triggers,
 * this endpoint just resets it to 0 when the conversation is viewed.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;

    // Verify conversation exists and user has access
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        pageConnection: {
          select: { companyId: true },
        },
        instagramConnection: {
          select: { companyId: true },
        },
        telegramConnection: {
          select: { companyId: true },
        },
        widgetConfig: {
          select: { companyId: true },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check access permissions
    const companyId =
      conversation.pageConnection?.companyId ||
      conversation.instagramConnection?.companyId ||
      conversation.telegramConnection?.companyId ||
      conversation.widgetConfig?.companyId;

    if (
      session.user.role !== "OWNER" &&
      session.user.companyId !== companyId
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Reset unread count to 0
    await db.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    });

    return NextResponse.json({
      success: true,
      conversationId,
      unreadCount: 0,
    });
  } catch (error) {
    console.error("Mark conversation as read error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

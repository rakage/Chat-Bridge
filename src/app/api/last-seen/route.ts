import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LastSeenService } from "@/lib/last-seen";

// GET: Fetch last seen timestamps for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const lastSeenMap = await LastSeenService.getUserLastSeen(session.user.id);
    
    // Convert Map to object for JSON serialization
    const lastSeenData: Record<string, string> = {};
    lastSeenMap.forEach((date, conversationId) => {
      lastSeenData[conversationId] = date.toISOString();
    });

    return NextResponse.json({ lastSeen: lastSeenData });
  } catch (error) {
    console.error("Error fetching last seen:", error);
    return NextResponse.json(
      { error: "Failed to fetch last seen data" },
      { status: 500 }
    );
  }
}

// POST: Update last seen timestamp for a conversation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationId, timestamp } = body;

    if (!conversationId) {
      return NextResponse.json(
        { error: "conversationId is required" },
        { status: 400 }
      );
    }

    const lastSeenAt = timestamp ? new Date(timestamp) : new Date();
    await LastSeenService.updateLastSeen(
      session.user.id,
      conversationId,
      lastSeenAt
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating last seen:", error);
    return NextResponse.json(
      { error: "Failed to update last seen" },
      { status: 500 }
    );
  }
}

// PATCH: Mark multiple conversations as seen
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { conversationIds } = body;

    if (!conversationIds || !Array.isArray(conversationIds)) {
      return NextResponse.json(
        { error: "conversationIds array is required" },
        { status: 400 }
      );
    }

    await LastSeenService.markConversationsAsSeen(
      session.user.id,
      conversationIds
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking conversations as seen:", error);
    return NextResponse.json(
      { error: "Failed to mark conversations as seen" },
      { status: 500 }
    );
  }
}

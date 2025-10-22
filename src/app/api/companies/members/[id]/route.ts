import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await withRateLimit(
      request,
      "API_WRITE",
      session.user.id
    );
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }

    if (!session.user.companyId) {
      return NextResponse.json(
        { error: "User doesn't belong to a company" },
        { status: 400 }
      );
    }

    // Only OWNER can remove members
    if (session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only company owners can remove team members" },
        { status: 403 }
      );
    }

    const userId = params.id;

    // Get the user to remove
    const userToRemove = await db.user.findUnique({
      where: { id: userId },
    });

    if (!userToRemove) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user belongs to the same company
    if (userToRemove.companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "User doesn't belong to your company" },
        { status: 403 }
      );
    }

    // Can't remove self
    if (userToRemove.id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself" },
        { status: 400 }
      );
    }

    // Can't remove other owners
    if (userToRemove.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove other owners" },
        { status: 403 }
      );
    }

    // Remove user from company
    await db.user.update({
      where: { id: userId },
      data: {
        companyId: null,
        role: "AGENT", // Reset to default role
      },
    });

    console.log(
      `✅ User ${userToRemove.email} removed from company by ${session.user.email}`
    );

    return NextResponse.json({
      success: true,
      message: "Team member removed successfully",
    });
  } catch (error) {
    console.error("Failed to remove team member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { withRateLimit } from "@/lib/rate-limit";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    // Check current user's role from CompanyMember table
    const currentUserMembership = await db.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: session.user.companyId,
        },
      },
    });

    if (!currentUserMembership) {
      return NextResponse.json(
        { error: "You are not a member of this company" },
        { status: 403 }
      );
    }

    // Only OWNER can remove members
    if (currentUserMembership.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only company owners can remove team members" },
        { status: 403 }
      );
    }

    const { id: userId } = await params;

    // Can't remove self
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself" },
        { status: 400 }
      );
    }

    // Get the CompanyMember to remove
    const memberToRemove = await db.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: userId,
          companyId: session.user.companyId,
        },
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!memberToRemove) {
      return NextResponse.json(
        { error: "User not found in your company" },
        { status: 404 }
      );
    }

    // Can't remove other owners
    if (memberToRemove.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove other owners" },
        { status: 403 }
      );
    }

    // Remove CompanyMember record
    await db.companyMember.delete({
      where: {
        userId_companyId: {
          userId: userId,
          companyId: session.user.companyId,
        },
      },
    });

    console.log(
      `✅ User ${memberToRemove.user.email} removed from company by ${session.user.email}`
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

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function POST(
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

    // Check user has company
    if (!session.user.companyId) {
      return NextResponse.json(
        { error: "User doesn't belong to a company" },
        { status: 400 }
      );
    }

    // Check user's role from CompanyMember table (not legacy User.role)
    const companyMember = await db.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: session.user.companyId,
        },
      },
    });

    if (!companyMember) {
      return NextResponse.json(
        { error: "You are not a member of this company" },
        { status: 403 }
      );
    }

    // Only ADMIN and OWNER can toggle invitations
    if (companyMember.role !== "ADMIN" && companyMember.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only admins and owners can toggle invitations" },
        { status: 403 }
      );
    }

    const { id: invitationId } = await params;

    // Find invitation
    const invitation = await db.companyInvitation.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        companyId: true,
        isActive: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Verify invitation belongs to user's company
    if (invitation.companyId !== session.user.companyId) {
      return NextResponse.json(
        { error: "You can only toggle invitations from your company" },
        { status: 403 }
      );
    }

    // Toggle invitation active status
    const updatedInvitation = await db.companyInvitation.update({
      where: { id: invitationId },
      data: {
        isActive: !invitation.isActive,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    console.log(
      `✅ Invitation ${invitationId} ${updatedInvitation.isActive ? "activated" : "paused"} by ${session.user.email}`
    );

    return createRateLimitResponse(
      {
        success: true,
        isActive: updatedInvitation.isActive,
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Failed to toggle invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

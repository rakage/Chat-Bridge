import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const validateInvitationSchema = z.object({
  code: z.string().min(1, "Invitation code is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const { code } = validateInvitationSchema.parse(body);

    // Find invitation
    const invitation = await db.companyInvitation.findUnique({
      where: { code },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                members: true, // Count from CompanyMember table, not legacy users
              },
            },
          },
        },
        invitedBy: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }

    // Check if invitation is active
    if (!invitation.isActive) {
      return NextResponse.json(
        { error: "This invitation has been paused" },
        { status: 400 }
      );
    }

    // Check if invitation is expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Check if invitation has reached max uses
    if (invitation.usedCount >= invitation.maxUses) {
      return NextResponse.json(
        { error: "This invitation has reached its maximum number of uses" },
        { status: 400 }
      );
    }

    // Check if invitation is already used (for single-use invitations)
    if (invitation.status === "ACCEPTED" && invitation.maxUses === 1) {
      return NextResponse.json(
        { error: "Invitation has already been used" },
        { status: 400 }
      );
    }

    // Check if email-specific invitation matches user's email
    if (invitation.email && invitation.email !== session.user.email) {
      return NextResponse.json(
        { error: "This invitation is for a different email address" },
        { status: 403 }
      );
    }

    // Check if user is already a member of THIS specific company
    const existingMembership = await db.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: invitation.companyId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: "You are already a member of this company" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      invitation: {
        companyName: invitation.company.name,
        memberCount: invitation.company._count.members,
        invitedBy: invitation.invitedBy.name,
        expiresAt: invitation.expiresAt,
        maxUses: invitation.maxUses,
        usedCount: invitation.usedCount,
        remainingUses: invitation.maxUses - invitation.usedCount,
      },
    });
  } catch (error) {
    console.error("Failed to validate invitation:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

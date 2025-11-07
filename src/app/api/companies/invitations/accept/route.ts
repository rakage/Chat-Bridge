import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

const acceptInvitationSchema = z.object({
  code: z.string().min(1, "Invitation code is required"),
});

export async function POST(request: NextRequest) {
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

    // Validate request body
    const body = await request.json();
    const { code } = acceptInvitationSchema.parse(body);

    // Find invitation
    const invitation = await db.companyInvitation.findUnique({
      where: { code },
      include: {
        company: true,
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid invitation code" },
        { status: 404 }
      );
    }

    // Validate invitation
    if (!invitation.isActive) {
      return NextResponse.json(
        { error: "This invitation has been paused" },
        { status: 400 }
      );
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    if (invitation.usedCount >= invitation.maxUses) {
      return NextResponse.json(
        { error: "This invitation has reached its maximum number of uses" },
        { status: 400 }
      );
    }

    if (invitation.status === "ACCEPTED" && invitation.maxUses === 1) {
      return NextResponse.json(
        { error: "Invitation has already been used" },
        { status: 400 }
      );
    }

    if (invitation.email && invitation.email !== session.user.email) {
      return NextResponse.json(
        { error: "This invitation is for a different email address" },
        { status: 403 }
      );
    }

    // Check if user already belongs to this company
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

    // Calculate new used count
    const newUsedCount = invitation.usedCount + 1;
    const isFullyUsed = newUsedCount >= invitation.maxUses;

    // Accept invitation: Create CompanyMember and update user/invitation in a transaction
    await db.$transaction([
      // Create CompanyMember with MEMBER role
      db.companyMember.create({
        data: {
          userId: session.user.id,
          companyId: invitation.companyId,
          role: "MEMBER",
        },
      }),
      // Update user to set current company (and legacy companyId for backward compatibility)
      db.user.update({
        where: { id: session.user.id },
        data: {
          companyId: invitation.companyId, // Legacy field
          currentCompanyId: invitation.companyId,
          role: "AGENT", // Legacy role field - new members join as AGENT
        },
      }),
      // Increment used count and mark as accepted if fully used
      db.companyInvitation.update({
        where: { id: invitation.id },
        data: {
          usedCount: newUsedCount,
          status: isFullyUsed ? "ACCEPTED" : "PENDING",
          acceptedAt: isFullyUsed ? new Date() : invitation.acceptedAt,
          acceptedByUserId: isFullyUsed ? session.user.id : invitation.acceptedByUserId,
        },
      }),
    ]);

    console.log(
      `✅ User ${session.user.email} accepted invitation and joined company ${invitation.company.name}`
    );

    return createRateLimitResponse(
      {
        success: true,
        company: {
          id: invitation.company.id,
          name: invitation.company.name,
        },
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Failed to accept invitation:", error);

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

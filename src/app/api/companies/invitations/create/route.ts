import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";
import crypto from "crypto";

const createInvitationSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  expiresInDays: z.number().min(1).max(30).default(7),
  maxUses: z.number().min(1).max(100).default(1),
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

    // Check user has company and is ADMIN or OWNER
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "User must belong to a company" },
        { status: 400 }
      );
    }

    if (user.role !== "ADMIN" && user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only admins and owners can create invitations" },
        { status: 403 }
      );
    }

    // Validate request body
    const body = await request.json();
    const { email, expiresInDays, maxUses } = createInvitationSchema.parse(body);

    // Generate unique invitation code
    const code = crypto.randomBytes(16).toString("hex");

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Create invitation
    const invitation = await db.companyInvitation.create({
      data: {
        code,
        companyId: user.companyId,
        invitedByUserId: session.user.id,
        email: email || null,
        expiresAt,
        maxUses,
        usedCount: 0,
        isActive: true,
        status: "PENDING",
      },
      include: {
        company: {
          select: {
            name: true,
          },
        },
        invitedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    console.log(
      `✅ Invitation created for company ${invitation.company.name} by ${session.user.email}`
    );

    // Generate invitation link
    const invitationLink = `${process.env.NEXTAUTH_URL}/join/${code}`;

    return createRateLimitResponse(
      {
        success: true,
        invitation: {
          id: invitation.id,
          code: invitation.code,
          link: invitationLink,
          email: invitation.email,
          expiresAt: invitation.expiresAt,
          maxUses: invitation.maxUses,
          usedCount: invitation.usedCount,
          isActive: invitation.isActive,
          companyName: invitation.company.name,
        },
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Failed to create invitation:", error);

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

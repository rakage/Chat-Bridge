import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await withRateLimit(
      request,
      "API_READ",
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

    // Only ADMIN and OWNER can view invitations
    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get all invitations for the company
    // Check if CompanyInvitation table exists
    let invitations: any[] = [];
    try {
      invitations = await db.companyInvitation.findMany({
        where: { companyId: session.user.companyId },
        include: {
          invitedBy: {
            select: {
              name: true,
              email: true,
            },
          },
          acceptedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch (error: any) {
      // Table doesn't exist yet - return empty array
      if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('findMany')) {
        console.warn("⚠️ CompanyInvitation table doesn't exist yet. Run: npx prisma db push");
        invitations = [];
      } else {
        throw error;
      }
    }

    return createRateLimitResponse(
      {
        invitations: invitations.map((inv) => ({
          id: inv.id,
          code: inv.code,
          email: inv.email,
          status: inv.status,
          isActive: inv.isActive,
          maxUses: inv.maxUses,
          usedCount: inv.usedCount,
          expiresAt: inv.expiresAt,
          acceptedAt: inv.acceptedAt,
          createdAt: inv.createdAt,
          invitedBy: {
            name: inv.invitedBy.name,
            email: inv.invitedBy.email,
          },
          acceptedBy: inv.acceptedBy
            ? {
                name: inv.acceptedBy.name,
                email: inv.acceptedBy.email,
              }
            : null,
        })),
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Failed to get invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

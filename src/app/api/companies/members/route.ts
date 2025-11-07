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

    // Only ADMIN and OWNER can view members
    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get all company members through CompanyMember table
    const companyMembers = await db.companyMember.findMany({
      where: { companyId: session.user.companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photoUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: [
        { role: "desc" }, // OWNER first, then ADMIN, then MEMBER
        { joinedAt: "asc" },
      ],
    });

    return createRateLimitResponse(
      {
        members: companyMembers.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          email: member.user.email,
          role: member.role, // Use CompanyMember role, not legacy User role
          photoUrl: member.user.photoUrl,
          createdAt: member.joinedAt, // Use joinedAt instead of user.createdAt
        })),
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Failed to get company members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

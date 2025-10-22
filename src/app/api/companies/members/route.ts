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

    // Get all company members
    const members = await db.user.findMany({
      where: { companyId: session.user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        photoUrl: true,
        createdAt: true,
      },
      orderBy: [
        { role: "desc" }, // OWNER first, then ADMIN, then AGENT
        { createdAt: "asc" },
      ],
    });

    return createRateLimitResponse(
      {
        members: members.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          photoUrl: member.photoUrl,
          createdAt: member.createdAt,
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

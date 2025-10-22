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

    // Get company details
    const company = await db.company.findUnique({
      where: { id: session.user.companyId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    return createRateLimitResponse(
      {
        company: {
          id: company.id,
          name: company.name,
          createdAt: company.createdAt,
          memberCount: company._count.users,
        },
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Failed to get company details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

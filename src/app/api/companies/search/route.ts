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

    // Get search query from URL params
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";

    if (!query || query.length < 2) {
      return createRateLimitResponse(
        { companies: [] },
        rateLimitResult
      );
    }

    // Search companies by name (case-insensitive)
    const companies = await db.company.findMany({
      where: {
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      take: 10, // Limit results
      orderBy: {
        name: "asc",
      },
    });

    return createRateLimitResponse(
      {
        companies: companies.map((company) => ({
          id: company.id,
          name: company.name,
          memberCount: company._count.users,
          createdAt: company.createdAt,
        })),
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Failed to search companies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

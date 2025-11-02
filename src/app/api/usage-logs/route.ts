import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user and company
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user?.companyId) {
      return NextResponse.json(
        { error: "User must be associated with a company" },
        { status: 400 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // TRAINING or AUTO_RESPONSE
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: any = {
      companyId: user.companyId,
    };

    if (type && (type === "TRAINING" || type === "AUTO_RESPONSE")) {
      where.type = type;
    }

    // Fetch usage logs
    const [logs, totalCount] = await Promise.all([
      db.usageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          type: true,
          provider: true,
          model: true,
          inputTokens: true,
          outputTokens: true,
          totalTokens: true,
          metadata: true,
          createdAt: true,
        },
      }),
      db.usageLog.count({ where }),
    ]);

    // Calculate statistics
    const stats = await db.usageLog.groupBy({
      by: ["type"],
      where: { companyId: user.companyId },
      _sum: {
        totalTokens: true,
        inputTokens: true,
        outputTokens: true,
      },
      _count: {
        id: true,
      },
    });

    const statistics = {
      training: {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        count: 0,
      },
      autoResponse: {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        count: 0,
      },
      overall: {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        count: 0,
      },
    };

    stats.forEach((stat) => {
      const tokens = {
        totalTokens: stat._sum.totalTokens || 0,
        inputTokens: stat._sum.inputTokens || 0,
        outputTokens: stat._sum.outputTokens || 0,
        count: stat._count.id || 0,
      };

      if (stat.type === "TRAINING") {
        statistics.training = tokens;
      } else if (stat.type === "AUTO_RESPONSE") {
        statistics.autoResponse = tokens;
      }

      statistics.overall.totalTokens += tokens.totalTokens;
      statistics.overall.inputTokens += tokens.inputTokens;
      statistics.overall.outputTokens += tokens.outputTokens;
      statistics.overall.count += tokens.count;
    });

    return NextResponse.json({
      success: true,
      logs,
      totalCount,
      statistics,
      pagination: {
        limit,
        offset,
        hasMore: offset + logs.length < totalCount,
      },
    });
  } catch (error) {
    console.error("Error fetching usage logs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

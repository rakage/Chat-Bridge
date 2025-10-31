import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "User must be associated with a company" },
        { status: 400 }
      );
    }

    // Clear all cached RAG responses for this company
    const result = await db.ragMessageCache.deleteMany({
      where: {
        companyId: user.companyId,
      },
    });

    console.log(`✅ Cleared ${result.count} cached RAG responses for company ${user.companyId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${result.count} cached response(s)`,
      clearedCount: result.count,
    });
  } catch (error) {
    console.error("Error clearing RAG cache:", error);
    return NextResponse.json(
      { error: "Failed to clear cache" },
      { status: 500 }
    );
  }
}

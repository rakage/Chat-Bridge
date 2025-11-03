import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Increment usage count when a canned response is used
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verify response exists and belongs to company
    const response = await db.cannedResponse.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    });

    if (!response) {
      return NextResponse.json(
        { error: "Canned response not found" },
        { status: 404 }
      );
    }

    // Increment usage count
    await db.cannedResponse.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error incrementing usage count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

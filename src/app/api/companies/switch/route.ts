import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const switchCompanySchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { companyId } = switchCompanySchema.parse(body);

    // Check if user is a member of this company
    const membership = await db.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: companyId,
        },
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this company" },
        { status: 403 }
      );
    }

    // Update user's current company (and legacy companyId for backward compatibility)
    await db.user.update({
      where: { id: session.user.id },
      data: {
        currentCompanyId: companyId,
        companyId: companyId, // Legacy field for backward compatibility
      },
    });

    console.log(
      `✅ User ${session.user.email} switched to company: ${membership.company.name} (${companyId})`
    );

    return NextResponse.json({
      success: true,
      company: {
        id: membership.company.id,
        name: membership.company.name,
        role: membership.role,
      },
      message: `Switched to ${membership.company.name}`,
    });
  } catch (error) {
    console.error("Failed to switch company:", error);

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

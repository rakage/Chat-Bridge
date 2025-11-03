import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all companies user is a member of
    const memberships = await db.companyMember.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    // Get user's current company
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { currentCompanyId: true },
    });

    const companies = memberships.map((membership) => ({
      id: membership.company.id,
      name: membership.company.name,
      role: membership.role,
      joinedAt: membership.joinedAt,
      createdAt: membership.company.createdAt,
      isCurrent: membership.company.id === user?.currentCompanyId,
    }));

    return NextResponse.json({
      companies,
      currentCompanyId: user?.currentCompanyId,
    });
  } catch (error) {
    console.error("Failed to list companies:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

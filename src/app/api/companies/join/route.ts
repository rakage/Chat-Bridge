import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

const joinCompanySchema = z.object({
  companyId: z.string().min(1, "Company ID is required"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await withRateLimit(
      request,
      "API_WRITE",
      session.user.id
    );
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }

    // Validate request body
    const body = await request.json();
    const { companyId } = joinCompanySchema.parse(body);

    // Check if company exists
    const company = await db.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      return NextResponse.json(
        { error: "Company not found" },
        { status: 404 }
      );
    }

    // Join the company in a transaction
    await db.$transaction(async (tx) => {
      // Create CompanyMember with MEMBER role
      await tx.companyMember.create({
        data: {
          userId: session.user.id,
          companyId: company.id,
          role: "MEMBER",
        },
      });

      // Update user to set this as current company (and legacy companyId for backward compatibility)
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          companyId: company.id, // Legacy field
          currentCompanyId: company.id,
          role: "AGENT", // Users who join a company start as AGENT
        },
      });
    });

    console.log(
      `✅ User ${session.user.email} joined company: ${company.name} (ID: ${company.id}) with MEMBER role`
    );

    return createRateLimitResponse(
      {
        success: true,
        company: {
          id: company.id,
          name: company.name,
          role: "MEMBER",
        },
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Failed to join company:", error);

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

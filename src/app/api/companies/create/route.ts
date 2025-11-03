import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required").max(100, "Company name must be less than 100 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const { name } = createCompanySchema.parse(body);

    // Create the company and company membership in a transaction
    const result = await db.$transaction(async (tx) => {
      // Create the company
      const company = await tx.company.create({
        data: {
          name: name.trim(),
        },
      });

      // Create CompanyMember with OWNER role
      await tx.companyMember.create({
        data: {
          userId: session.user.id,
          companyId: company.id,
          role: "OWNER",
        },
      });

      // Update user to set this as current company (and legacy companyId for backward compatibility)
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          companyId: company.id, // Legacy field
          currentCompanyId: company.id,
        },
      });

      return company;
    });

    console.log(`✅ Company created: ${result.name} (ID: ${result.id}) by user ${session.user.email} with OWNER role`);

    return NextResponse.json({
      success: true,
      company: {
        id: result.id,
        name: result.name,
        createdAt: result.createdAt,
        role: "OWNER",
      },
    });
  } catch (error) {
    console.error("Failed to create company:", error);

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
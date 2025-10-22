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

    // Check if user already has a company
    const userWithCompany = await db.user.findUnique({
      where: { id: session.user.id },
      include: { company: true },
    });

    if (!userWithCompany) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userWithCompany.companyId) {
      return NextResponse.json(
        { error: "User already belongs to a company" },
        { status: 400 }
      );
    }

    // Validate request body
    const body = await request.json();
    const { name } = createCompanySchema.parse(body);

    // Create the company
    const company = await db.company.create({
      data: {
        name: name.trim(),
      },
    });

    // Update user to be assigned to this company
    await db.user.update({
      where: { id: session.user.id },
      data: {
        companyId: company.id,
      },
    });

    console.log(`✅ Company created: ${company.name} (ID: ${company.id}) by user ${session.user.email}`);

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
        createdAt: company.createdAt,
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
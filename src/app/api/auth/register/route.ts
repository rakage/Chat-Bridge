import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { withRateLimit, createRateLimitResponse } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // ============================================
    // RATE LIMITING: AUTH_SIGNUP
    // Max 3 signups per hour, block for 1 hour
    // ============================================
    const rateLimitResult = await withRateLimit(req, "AUTH_SIGNUP");
    if (rateLimitResult instanceof NextResponse) {
      return rateLimitResult;
    }

    const { email, password, name } = await req.json();

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user - all users start as OWNER with no company
    // They will create their own company after registration
    const user = await db.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split("@")[0],
        role: Role.OWNER, // All users start as OWNER so they can create companies
        companyId: null, // No company initially
      },
    });

    console.log(`🆕 User registered: ${user.email} (ID: ${user.id}) - needs to create company`);

    return createRateLimitResponse(
      {
        message: "User created successfully",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
      rateLimitResult
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

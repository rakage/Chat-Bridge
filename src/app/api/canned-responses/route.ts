import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { socketService } from "@/lib/socket";
import { z } from "zod";

const createCannedResponseSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  content: z.string().min(1, "Content is required").max(5000),
  shortcut: z.string().min(1).max(50).optional(),
  category: z.string().max(50).optional(),
  scope: z.enum(["PERSONAL", "COMPANY"]).default("PERSONAL"),
});

// GET - List all canned responses for the user's company
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    // Build query filters
    const where: any = {
      companyId: session.user.companyId,
      isActive: true,
    };

    // Filter by scope
    if (scope === "personal") {
      where.OR = [
        { scope: "PERSONAL", createdById: session.user.id },
        { scope: "COMPANY" },
      ];
    } else if (scope === "company") {
      where.scope = "COMPANY";
    } else {
      // Default: show user's personal + all company responses
      where.OR = [
        { scope: "PERSONAL", createdById: session.user.id },
        { scope: "COMPANY" },
      ];
    }

    // Filter by category
    if (category && category !== "all") {
      where.category = category;
    }

    // Search in title, content, or shortcut
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { shortcut: { contains: search, mode: "insensitive" } },
      ];
    }

    const responses = await db.cannedResponse.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { usageCount: "desc" }, // Most used first
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ responses });
  } catch (error) {
    console.error("Error fetching canned responses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new canned response
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validated = createCannedResponseSchema.parse(body);

    // Check if shortcut already exists (if provided)
    if (validated.shortcut) {
      const existing = await db.cannedResponse.findUnique({
        where: {
          companyId_shortcut: {
            companyId: session.user.companyId,
            shortcut: validated.shortcut,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: `Shortcut "/${validated.shortcut}" is already in use` },
          { status: 400 }
        );
      }
    }

    // Only OWNER or ADMIN can create COMPANY-wide responses
    if (validated.scope === "COMPANY") {
      if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only owners and admins can create company-wide responses" },
          { status: 403 }
        );
      }
    }

    const response = await db.cannedResponse.create({
      data: {
        ...validated,
        companyId: session.user.companyId,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Emit Socket.IO event to notify all clients in the company
    socketService.emitToCompany(session.user.companyId, "canned-response:created", {
      response,
    });

    return NextResponse.json({ response }, { status: 201 });
  } catch (error) {
    console.error("Error creating canned response:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

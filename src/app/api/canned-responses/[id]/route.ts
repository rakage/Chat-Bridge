import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { socketService } from "@/lib/socket";
import { z } from "zod";

const updateCannedResponseSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  content: z.string().min(1).max(5000).optional(),
  shortcut: z.string().min(1).max(50).optional(),
  category: z.string().max(50).optional(),
  scope: z.enum(["PERSONAL", "COMPANY"]).optional(),
  isActive: z.boolean().optional(),
});

// GET - Get single canned response
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const response = await db.cannedResponse.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
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

    if (!response) {
      return NextResponse.json(
        { error: "Canned response not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ response });
  } catch (error) {
    console.error("Error fetching canned response:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update canned response
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validated = updateCannedResponseSchema.parse(body);

    // Find existing response
    const existing = await db.cannedResponse.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Canned response not found" },
        { status: 404 }
      );
    }

    // Check permissions
    // Only creator can edit PERSONAL responses
    // Only OWNER/ADMIN can edit COMPANY responses
    if (existing.scope === "PERSONAL" && existing.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "You can only edit your own personal responses" },
        { status: 403 }
      );
    }

    if (existing.scope === "COMPANY") {
      if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only owners and admins can edit company-wide responses" },
          { status: 403 }
        );
      }
    }

    // If changing scope to COMPANY, check permissions
    if (validated.scope === "COMPANY" && existing.scope !== "COMPANY") {
      if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only owners and admins can create company-wide responses" },
          { status: 403 }
        );
      }
    }

    // Check if new shortcut conflicts
    if (validated.shortcut && validated.shortcut !== existing.shortcut) {
      const conflict = await db.cannedResponse.findFirst({
        where: {
          companyId: session.user.companyId,
          shortcut: validated.shortcut,
          id: { not: id },
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: `Shortcut "/${validated.shortcut}" is already in use` },
          { status: 400 }
        );
      }
    }

    const updated = await db.cannedResponse.update({
      where: { id },
      data: validated,
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
    socketService.emitToCompany(session.user.companyId, "canned-response:updated", {
      response: updated,
    });

    return NextResponse.json({ response: updated });
  } catch (error) {
    console.error("Error updating canned response:", error);

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

// DELETE - Delete canned response
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Find existing response
    const existing = await db.cannedResponse.findFirst({
      where: {
        id,
        companyId: session.user.companyId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Canned response not found" },
        { status: 404 }
      );
    }

    // Check permissions
    if (existing.scope === "PERSONAL" && existing.createdById !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own personal responses" },
        { status: 403 }
      );
    }

    if (existing.scope === "COMPANY") {
      if (session.user.role !== "OWNER" && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { error: "Only owners and admins can delete company-wide responses" },
          { status: 403 }
        );
      }
    }

    // Soft delete by setting isActive to false
    await db.cannedResponse.update({
      where: { id },
      data: { isActive: false },
    });

    // Emit Socket.IO event to notify all clients in the company
    socketService.emitToCompany(session.user.companyId, "canned-response:deleted", {
      id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting canned response:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

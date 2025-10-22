import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const toggleSchema = z.object({
  autoBot: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ connectionId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user
    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.companyId) {
      return NextResponse.json(
        { error: "User must be associated with a company" },
        { status: 400 }
      );
    }

    const { connectionId } = await params;

    // Find Instagram connection
    const connection = await db.instagramConnection.findUnique({
      where: { id: connectionId },
    });

    if (!connection) {
      return NextResponse.json(
        { error: "Instagram connection not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (connection.companyId !== user.companyId) {
      return NextResponse.json(
        { error: "Unauthorized to modify this connection" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const validation = toggleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: validation.error.issues },
        { status: 400 }
      );
    }

    const { autoBot } = validation.data;

    // Check if LLM config exists when enabling autoBot
    if (autoBot) {
      const llmConfig = await db.providerConfig.findUnique({
        where: { companyId: user.companyId },
      });

      if (!llmConfig || !llmConfig.apiKeyEnc) {
        return NextResponse.json(
          { error: "LLM Configuration Required: Please configure your LLM provider in Bot Settings before enabling auto-response." },
          { status: 400 }
        );
      }
    }

    // Update Instagram connection
    const updatedConnection = await db.instagramConnection.update({
      where: { id: connectionId },
      data: { autoBot },
    });

    console.log(
      `✅ Updated autoBot for Instagram @${updatedConnection.username} (${connectionId}) to ${autoBot}`
    );

    return NextResponse.json({
      success: true,
      autoBot: updatedConnection.autoBot,
      message: `Auto-bot ${autoBot ? "enabled" : "disabled"} for @${updatedConnection.username}`,
    });
  } catch (error) {
    console.error("Error toggling Instagram autoBot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

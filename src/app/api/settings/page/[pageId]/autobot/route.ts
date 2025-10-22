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
  { params }: { params: Promise<{ pageId: string }> }
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

    const { pageId } = await params;

    // Find page connection
    const pageConnection = await db.pageConnection.findUnique({
      where: { pageId },
    });

    if (!pageConnection) {
      return NextResponse.json(
        { error: "Page connection not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (pageConnection.companyId !== user.companyId) {
      return NextResponse.json(
        { error: "Unauthorized to modify this page" },
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

    // Update page connection
    const updatedPage = await db.pageConnection.update({
      where: { pageId },
      data: { autoBot },
    });

    console.log(
      `✅ Updated autoBot for Facebook page ${updatedPage.pageName} (${pageId}) to ${autoBot}`
    );

    return NextResponse.json({
      success: true,
      autoBot: updatedPage.autoBot,
      message: `Auto-bot ${autoBot ? "enabled" : "disabled"} for ${updatedPage.pageName}`,
    });
  } catch (error) {
    console.error("Error toggling page autoBot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

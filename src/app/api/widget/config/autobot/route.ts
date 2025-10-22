import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const toggleSchema = z.object({
  autoBot: z.boolean(),
});

export async function PATCH(request: NextRequest) {
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

    // Find widget config
    const widgetConfig = await db.widgetConfig.findUnique({
      where: { companyId: user.companyId },
    });

    if (!widgetConfig) {
      return NextResponse.json(
        { error: "Widget configuration not found" },
        { status: 404 }
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
      const llmConfig = await db.lLMConfig.findUnique({
        where: { companyId: user.companyId },
      });

      if (!llmConfig || !llmConfig.apiKey) {
        return NextResponse.json(
          { error: "LLM Configuration Required: Please configure your LLM provider in Bot Settings before enabling auto-response." },
          { status: 400 }
        );
      }
    }

    // Update widget config
    const updatedWidget = await db.widgetConfig.update({
      where: { id: widgetConfig.id },
      data: { autoBot },
    });

    console.log(
      `✅ Updated autoBot for chat widget (${widgetConfig.id}) to ${autoBot}`
    );

    return NextResponse.json({
      success: true,
      autoBot: updatedWidget.autoBot,
      message: `Auto-bot ${autoBot ? "enabled" : "disabled"} for chat widget`,
    });
  } catch (error) {
    console.error("Error toggling widget autoBot:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

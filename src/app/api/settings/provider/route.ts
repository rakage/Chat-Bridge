import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { llmService } from "@/lib/llm/service";
import { socketService } from "@/lib/socket";
import { z } from "zod";

const providerConfigSchema = z.object({
  provider: z.enum(["OPENAI", "GEMINI"]),
  apiKey: z.string().min(1),
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().min(1).max(4000),
  systemPrompt: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!session.user.companyId) {
      return NextResponse.json(
        { error: "No company associated" },
        { status: 400 }
      );
    }

    const providerConfig = await db.providerConfig.findUnique({
      where: { companyId: session.user.companyId },
    });

    if (!providerConfig) {
      return NextResponse.json({ config: null });
    }

    // Return config without decrypted API key
    return NextResponse.json({
      config: {
        id: providerConfig.id,
        provider: providerConfig.provider,
        model: providerConfig.model,
        temperature: providerConfig.temperature,
        maxTokens: providerConfig.maxTokens,
        systemPrompt: providerConfig.systemPrompt,
        hasApiKey: !!providerConfig.apiKeyEnc,
      },
    });
  } catch (error) {
    console.error("Get provider config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!session.user.companyId) {
      return NextResponse.json(
        { error: "No company associated" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const config = providerConfigSchema.parse(body);

    // Validate provider and model
    if (!llmService.isProviderSupported(config.provider)) {
      return NextResponse.json(
        { error: "Unsupported provider" },
        { status: 400 }
      );
    }

    const availableModels = llmService.getAvailableModels(
      config.provider as any
    );
    if (!availableModels.includes(config.model)) {
      return NextResponse.json(
        { error: "Unsupported model for this provider" },
        { status: 400 }
      );
    }

    // Encrypt API key
    const encryptedApiKey = await encrypt(config.apiKey);
    console.log(
      "🔐 Encrypted API key type:",
      typeof encryptedApiKey,
      "length:",
      encryptedApiKey.length
    );

    // Upsert provider config
    const providerConfig = await db.providerConfig.upsert({
      where: { companyId: session.user.companyId },
      create: {
        companyId: session.user.companyId,
        provider: config.provider as any,
        apiKeyEnc: encryptedApiKey,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        systemPrompt: config.systemPrompt,
      },
      update: {
        provider: config.provider as any,
        apiKeyEnc: encryptedApiKey,
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        systemPrompt: config.systemPrompt,
      },
    });

    // Clear provider cache to use new config
    llmService.clearProviders();

    return NextResponse.json({
      config: {
        id: providerConfig.id,
        provider: providerConfig.provider,
        model: providerConfig.model,
        temperature: providerConfig.temperature,
        maxTokens: providerConfig.maxTokens,
        systemPrompt: providerConfig.systemPrompt,
        hasApiKey: true,
      },
    });
  } catch (error) {
    console.error("Save provider config error:", error);

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

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!session.user.companyId) {
      return NextResponse.json(
        { error: "No company associated" },
        { status: 400 }
      );
    }

    // Check if provider config exists
    const providerConfig = await db.providerConfig.findUnique({
      where: { companyId: session.user.companyId },
    });

    if (!providerConfig) {
      return NextResponse.json(
        { error: "No LLM configuration found" },
        { status: 404 }
      );
    }

    // STEP 1: Get all integration IDs for this company
    const [facebookPages, instagramConnections, telegramConnections, widgetConfigs] = await Promise.all([
      db.pageConnection.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true },
      }),
      db.instagramConnection.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true },
      }),
      db.telegramConnection.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true },
      }),
      db.widgetConfig.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true },
      }),
    ]);

    const pageConnectionIds = facebookPages.map(p => p.id);
    const instagramConnectionIds = instagramConnections.map(c => c.id);
    const telegramConnectionIds = telegramConnections.map(c => c.id);
    const widgetConfigIds = widgetConfigs.map(w => w.id);

    // STEP 2: Disable auto-response for all integrations AND existing conversations
    const disableResults = await Promise.all([
      // Disable Facebook pages auto-response
      db.pageConnection.updateMany({
        where: { companyId: session.user.companyId, autoBot: true },
        data: { autoBot: false },
      }),
      // Disable Instagram auto-response
      db.instagramConnection.updateMany({
        where: { companyId: session.user.companyId, autoBot: true },
        data: { autoBot: false },
      }),
      // Disable Telegram auto-response
      db.telegramConnection.updateMany({
        where: { companyId: session.user.companyId, autoBot: true },
        data: { autoBot: false },
      }),
      // Disable widget auto-response
      db.widgetConfig.updateMany({
        where: { companyId: session.user.companyId, autoBot: true },
        data: { autoBot: false },
      }),
      // ============================================
      // CRITICAL FIX: Disable autoBot for ALL EXISTING conversations
      // ============================================
      // Disable Facebook conversations
      pageConnectionIds.length > 0 ? db.conversation.updateMany({
        where: {
          pageConnectionId: { in: pageConnectionIds },
          autoBot: true,
        },
        data: { autoBot: false },
      }) : Promise.resolve({ count: 0 }),
      // Disable Instagram conversations
      instagramConnectionIds.length > 0 ? db.conversation.updateMany({
        where: {
          instagramConnectionId: { in: instagramConnectionIds },
          autoBot: true,
        },
        data: { autoBot: false },
      }) : Promise.resolve({ count: 0 }),
      // Disable Telegram conversations
      telegramConnectionIds.length > 0 ? db.conversation.updateMany({
        where: {
          telegramConnectionId: { in: telegramConnectionIds },
          autoBot: true,
        },
        data: { autoBot: false },
      }) : Promise.resolve({ count: 0 }),
      // Disable Widget conversations
      widgetConfigIds.length > 0 ? db.conversation.updateMany({
        where: {
          widgetConfigId: { in: widgetConfigIds },
          autoBot: true,
        },
        data: { autoBot: false },
      }) : Promise.resolve({ count: 0 }),
    ]);

    const [
      fbPagesDisabled, 
      igConnectionsDisabled, 
      tgConnectionsDisabled, 
      widgetDisabled,
      fbConversationsDisabled,
      igConversationsDisabled,
      tgConversationsDisabled,
      widgetConversationsDisabled
    ] = disableResults;

    // Delete the provider config
    await db.providerConfig.delete({
      where: { companyId: session.user.companyId },
    });

    // Clear provider cache
    llmService.clearProviders();

    console.log(
      `✅ Deleted LLM config for company ${session.user.companyId}:`
    );
    console.log(`   - Disabled ${fbPagesDisabled.count} Facebook page(s)`);
    console.log(`   - Disabled ${igConnectionsDisabled.count} Instagram connection(s)`);
    console.log(`   - Disabled ${tgConnectionsDisabled.count} Telegram connection(s)`);
    console.log(`   - Disabled ${widgetDisabled.count} widget(s)`);
    console.log(`   - Disabled ${fbConversationsDisabled.count} Facebook conversation(s)`);
    console.log(`   - Disabled ${igConversationsDisabled.count} Instagram conversation(s)`);
    console.log(`   - Disabled ${tgConversationsDisabled.count} Telegram conversation(s)`);
    console.log(`   - Disabled ${widgetConversationsDisabled.count} widget conversation(s)`);

    // ============================================
    // CRITICAL: Emit socket events to update UI in real-time
    // ============================================
    try {
      // Get all affected conversation IDs
      const affectedConversations = await db.conversation.findMany({
        where: {
          OR: [
            pageConnectionIds.length > 0 ? { pageConnectionId: { in: pageConnectionIds } } : {},
            instagramConnectionIds.length > 0 ? { instagramConnectionId: { in: instagramConnectionIds } } : {},
            telegramConnectionIds.length > 0 ? { telegramConnectionId: { in: telegramConnectionIds } } : {},
            widgetConfigIds.length > 0 ? { widgetConfigId: { in: widgetConfigIds } } : {},
          ].filter(obj => Object.keys(obj).length > 0),
        },
        select: { id: true },
      });

      // Emit autoBot disabled event for each conversation
      for (const conversation of affectedConversations) {
        socketService.emitToConversation(conversation.id, "conversation:autobot-changed", {
          conversationId: conversation.id,
          autoBot: false,
        });
        
        // Also emit to company room for conversation list updates
        socketService.emitToCompany(session.user.companyId, "conversation:view-update", {
          conversationId: conversation.id,
          type: "bot_status_changed",
          autoBot: false,
          timestamp: new Date().toISOString(),
        });
      }

      console.log(`📡 Emitted autoBot disabled events for ${affectedConversations.length} conversation(s)`);
    } catch (socketError) {
      console.error("⚠️ Failed to emit socket events (UI may not update immediately):", socketError);
      // Don't fail the request if socket emissions fail
    }

    return NextResponse.json({
      success: true,
      message: "LLM configuration deleted successfully. All auto-response features have been disabled.",
      stats: {
        integrations: {
          facebook: fbPagesDisabled.count,
          instagram: igConnectionsDisabled.count,
          telegram: tgConnectionsDisabled.count,
          widget: widgetDisabled.count,
        },
        conversations: {
          facebook: fbConversationsDisabled.count,
          instagram: igConversationsDisabled.count,
          telegram: tgConversationsDisabled.count,
          widget: widgetConversationsDisabled.count,
          total: fbConversationsDisabled.count + igConversationsDisabled.count + 
                 tgConversationsDisabled.count + widgetConversationsDisabled.count,
        },
      },
    });
  } catch (error) {
    console.error("Delete provider config error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

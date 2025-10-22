import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { TelegramBot } from "@/lib/telegram-bot";

export async function POST(request: NextRequest) {
  try {
    console.log("🔌 Telegram disconnect request received");

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.companyId) {
      console.error("❌ User has no company");
      return NextResponse.json({ error: "User must belong to a company" }, { status: 400 });
    }

    const { botId } = await request.json();

    if (!botId) {
      console.error("❌ Missing bot ID");
      return NextResponse.json(
        { error: "Missing botId" },
        { status: 400 }
      );
    }

    console.log(`🔌 Disconnecting Telegram bot ${botId} for company ${session.user.companyId}`);

    // First check if the connection exists and belongs to this company
    const existingConnection = await db.telegramConnection.findUnique({
      where: {
        companyId_botId: {
          companyId: session.user.companyId,
          botId: botId,
        },
      },
    });

    if (!existingConnection) {
      console.error("❌ Telegram connection not found or doesn't belong to this company");
      return NextResponse.json(
        { error: "Telegram connection not found" },
        { status: 404 }
      );
    }

    // Try to delete webhook from Telegram
    try {
      const botToken = await decrypt(existingConnection.botTokenEnc);
      const telegramBot = new TelegramBot(botToken);
      await telegramBot.deleteWebhook();
      console.log("✅ Webhook deleted from Telegram");
    } catch (webhookError) {
      console.warn("⚠️ Could not delete webhook from Telegram:", webhookError);
      // Continue with deletion anyway
    }

    // Delete all conversations associated with this Telegram connection
    await db.conversation.deleteMany({
      where: {
        telegramConnectionId: existingConnection.id,
      },
    });

    // Delete the Telegram connection
    await db.telegramConnection.delete({
      where: {
        id: existingConnection.id,
      },
    });

    console.log("✅ Telegram connection disconnected successfully");

    return NextResponse.json({
      success: true,
      message: `Telegram bot @${existingConnection.botUsername} disconnected successfully`,
    });

  } catch (error) {
    console.error("❌ Error disconnecting Telegram bot:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Telegram bot" },
      { status: 500 }
    );
  }
}

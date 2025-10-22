import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { TelegramBot, isValidBotToken, getBotIdFromToken } from "@/lib/telegram-bot";

export async function POST(request: NextRequest) {
  try {
    console.log("💾 Telegram save connection request received");

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.companyId) {
      console.error("❌ User has no company");
      return NextResponse.json({ error: "User must belong to a company" }, { status: 400 });
    }

    const { botToken } = await request.json();

    if (!botToken) {
      console.error("❌ Missing bot token");
      return NextResponse.json(
        { error: "Bot token is required" },
        { status: 400 }
      );
    }

    // Validate bot token format
    if (!isValidBotToken(botToken)) {
      console.error("❌ Invalid bot token format");
      return NextResponse.json(
        { error: "Invalid bot token format" },
        { status: 400 }
      );
    }

    console.log(`💾 Validating Telegram bot token for user ${session.user.id}`);

    // Validate bot token with Telegram API
    const telegramBot = new TelegramBot(botToken);
    const botInfoResponse = await telegramBot.getMe();

    if (!botInfoResponse.ok || !botInfoResponse.result) {
      console.error("❌ Invalid bot token - Telegram API rejected it");
      return NextResponse.json(
        { error: "Invalid bot token. Please check and try again." },
        { status: 400 }
      );
    }

    const botInfo = botInfoResponse.result;
    const botId = getBotIdFromToken(botToken);

    console.log(`✅ Bot validated: @${botInfo.username} (${botInfo.first_name})`);

    // Set up webhook
    const webhookUrl = `${process.env.NEXTAUTH_URL}/api/webhook/telegram`;
    console.log(`📡 Setting webhook to: ${webhookUrl}`);

    const webhookResponse = await telegramBot.setWebhook(webhookUrl);
    const webhookSet = webhookResponse.ok;

    if (!webhookSet) {
      console.error("⚠️ Failed to set webhook:", webhookResponse.description);
      // Continue anyway - we'll save the connection and retry webhook later
    } else {
      console.log("✅ Webhook set successfully");
    }

    // Get bot profile photo if available
    let profilePictureUrl: string | null = null;
    try {
      const photosResponse = await telegramBot.getUserProfilePhotos(botInfo.id, 0, 1);
      if (photosResponse.ok && photosResponse.result.photos.length > 0) {
        const photo = photosResponse.result.photos[0][0]; // Get smallest size
        const fileResponse = await telegramBot.getFile(photo.file_id);
        if (fileResponse.ok && fileResponse.result?.file_path) {
          profilePictureUrl = telegramBot.getFileUrl(fileResponse.result.file_path);
        }
      }
    } catch (photoError) {
      console.warn("⚠️ Could not fetch bot profile photo:", photoError);
      // Continue without profile photo
    }

    // Save to database using Prisma (upsert to handle updates)
    const telegramConnection = await db.telegramConnection.upsert({
      where: {
        companyId_botId: {
          companyId: session.user.companyId,
          botId: botId,
        },
      },
      update: {
        botUsername: botInfo.username || "",
        botName: botInfo.first_name,
        botTokenEnc: await encrypt(botToken),
        profilePictureUrl: profilePictureUrl,
        webhookUrl: webhookUrl,
        webhookSet: webhookSet,
        isActive: true,
      },
      create: {
        companyId: session.user.companyId,
        botId: botId,
        botUsername: botInfo.username || "",
        botName: botInfo.first_name,
        botTokenEnc: await encrypt(botToken),
        profilePictureUrl: profilePictureUrl,
        webhookUrl: webhookUrl,
        webhookSet: webhookSet,
        isActive: true,
      },
    });

    console.log("📊 Telegram connection saved to database:", {
      id: telegramConnection.id,
      botUsername: telegramConnection.botUsername,
      companyId: telegramConnection.companyId,
      webhookSet: telegramConnection.webhookSet,
    });

    return NextResponse.json({
      success: true,
      message: `Telegram bot @${botInfo.username} connected successfully`,
      connection: {
        id: telegramConnection.id,
        botUsername: telegramConnection.botUsername,
        botName: telegramConnection.botName,
        botId: telegramConnection.botId,
        webhookSet: telegramConnection.webhookSet,
        profilePictureUrl: telegramConnection.profilePictureUrl,
      },
    });

  } catch (error) {
    console.error("❌ Error saving Telegram connection:", error);
    return NextResponse.json(
      { error: "Failed to save Telegram connection" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if webhook environment variables are configured
    const webhookVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
    const facebookAppSecret = process.env.FACEBOOK_APP_SECRET;
    const facebookAppId = process.env.FACEBOOK_APP_ID;
    const nextAuthUrl = process.env.NEXTAUTH_URL;

    const status = {
      webhookVerifyToken: !!webhookVerifyToken,
      facebookAppSecret: !!facebookAppSecret,
      facebookAppId: !!facebookAppId,
      nextAuthUrl: !!nextAuthUrl,
      webhookUrl: nextAuthUrl ? `${nextAuthUrl}/api/webhook/facebook` : null,
      isComplete: !!(webhookVerifyToken && facebookAppSecret && facebookAppId && nextAuthUrl),
      recommendations: [] as string[],
    };

    // Add recommendations for missing configurations
    if (!webhookVerifyToken) {
      status.recommendations.push("Add WEBHOOK_VERIFY_TOKEN to your environment variables");
    }
    if (!facebookAppSecret) {
      status.recommendations.push("Add FACEBOOK_APP_SECRET to your environment variables");
    }
    if (!facebookAppId) {
      status.recommendations.push("Add FACEBOOK_APP_ID to your environment variables");
    }
    if (!nextAuthUrl) {
      status.recommendations.push("Add NEXTAUTH_URL to your environment variables");
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error("Error checking webhook status:", error);
    return NextResponse.json(
      { error: "Failed to check webhook status" },
      { status: 500 }
    );
  }
}

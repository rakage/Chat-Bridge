import { NextRequest, NextResponse } from "next/server";
import { facebookAPI } from "@/lib/facebook";
import { db } from "@/lib/db";
import {
  getIncomingMessageQueue,
  processIncomingMessageDirect,
} from "@/lib/queue";
import { decrypt } from "@/lib/encryption";

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("Webhook verification attempt:", {
    mode,
    token: token ? "***" : null,
    challenge,
  });

  if (!mode || !token || !challenge) {
    console.error("Missing required parameters:", {
      mode,
      token: !!token,
      challenge: !!challenge,
    });
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  if (mode === "subscribe") {
    try {
      // Check if token matches any page's verify token in database
      const pageConnections = await db.pageConnection.findMany({
        select: {
          pageId: true,
          pageName: true,
          verifyTokenEnc: true,
        },
      });

      let isValidToken = false;
      let matchedPage = null;

      for (const page of pageConnections) {
        try {
          const decryptedVerifyToken = await decrypt(page.verifyTokenEnc);
          if (token === decryptedVerifyToken) {
            isValidToken = true;
            matchedPage = page;
            break;
          }
        } catch (decryptError) {
          console.error(
            `Error decrypting verify token for page ${page.pageId}:`,
            decryptError
          );
          continue;
        }
      }

      // Also check environment variable as fallback
      const envVerifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
      console.log("🔍 Checking environment verify token:", {
        hasEnvToken: !!envVerifyToken,
        tokenMatches: envVerifyToken === token,
      });

      if (!isValidToken && envVerifyToken && token === envVerifyToken) {
        isValidToken = true;
        matchedPage = { pageName: "Environment Token" };
        console.log("✅ Environment token verified successfully");
      }

      if (isValidToken) {
        console.log(
          "Webhook verified successfully for:",
          matchedPage?.pageName || "Unknown"
        );
        return new NextResponse(challenge, {
          status: 200,
          headers: {
            "Content-Type": "text/plain",
          },
        });
      } else {
        console.error("❌ Invalid verify token received:", token);
        console.error(
          "📝 Available tokens in database:",
          pageConnections.length
        );
        console.error(
          "🔧 Environment token available:",
          !!process.env.WEBHOOK_VERIFY_TOKEN
        );
        return NextResponse.json(
          { error: "Invalid verify token" },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error("Error during webhook verification:", error);
      return NextResponse.json(
        { error: "Server error during verification" },
        { status: 500 }
      );
    }
  }

  console.error("Invalid webhook mode:", mode);
  return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
}

// Webhook events (POST)
// NOTE: No rate limiting on webhooks - they come from Facebook's servers, not users
// Signature verification provides protection against unauthorized requests
export async function POST(request: NextRequest) {
  try {
    const signature =
      request.headers.get("x-hub-signature-256") ||
      request.headers.get("x-hub-signature") ||
      "";
    const body = await request.text();

    console.log("📨 Webhook POST received:");
    console.log("📨 Signature header:", signature ? "present" : "missing");
    console.log("📨 Body length:", body.length);

    // Enhanced signature verification with proper security
    const skipSignatureVerification =
      process.env.NODE_ENV === "development" ||
      process.env.SKIP_WEBHOOK_SIGNATURE === "true";

    if (!skipSignatureVerification) {
      // Verify signature using enhanced FacebookAPI method
      if (!signature) {
        console.error("❌ Missing webhook signature");
        return NextResponse.json(
          { error: "Missing signature" },
          { status: 403 }
        );
      }

      const appSecret = process.env.FACEBOOK_APP_SECRET;
      if (!appSecret) {
        console.warn(
          "⚠️ FACEBOOK_APP_SECRET not set, skipping signature verification"
        );
      } else {
        console.log("🔐 Verifying webhook signature...");
        try {
          // Try SHA256 first (recommended), then fallback to SHA1 (legacy)
          let isValidSignature = false;
          
          if (signature.startsWith('sha256=')) {
            isValidSignature = facebookAPI.verifyWebhookSignatureSHA256(body, signature);
            console.log("🔐 Using SHA256 signature verification");
          } else {
            isValidSignature = facebookAPI.verifyWebhookSignature(body, signature);
            console.log("🔐 Using legacy SHA1 signature verification");
          }

          if (!isValidSignature) {
            console.error("❌ Invalid webhook signature");
            console.error("❌ Received signature:", signature);
            return NextResponse.json(
              { error: "Invalid signature" },
              { status: 403 }
            );
          }
          console.log("✅ Webhook signature verified successfully");
        } catch (sigError) {
          console.error("❌ Signature verification error:", sigError);
          return NextResponse.json(
            { error: "Signature verification failed" },
            { status: 403 }
          );
        }
      }
    } else {
      console.log("⚠️ Skipping signature verification (development mode)");
    }

    const payload = JSON.parse(body);
    console.log("Received webhook payload:", JSON.stringify(payload, null, 2));

    // Parse webhook entries
    const entries = facebookAPI.parseWebhookPayload(payload);

    // Use the improved processor with Chatwoot-inspired architecture
    const { FacebookWebhookProcessor } = await import("@/lib/facebook-webhook-processor");
    const result = await FacebookWebhookProcessor.processWebhookPayload(entries);

    // Return appropriate status based on processing result
    if (result.success) {
      return NextResponse.json({ 
        status: "ok",
        processed: result.totalProcessed,
      });
    } else {
      console.error("⚠️ Webhook processing completed with errors:", result.totalErrors);
      return NextResponse.json({ 
        status: "partial",
        processed: result.totalProcessed,
        errors: result.totalErrors,
      });
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Disable body size limit for webhook
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "1mb",
    },
  },
};

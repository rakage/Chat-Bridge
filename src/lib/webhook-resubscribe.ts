/**
 * Auto-resubscribe all Facebook pages to webhooks
 * Call this when the server starts to ensure all pages are subscribed
 */

import { db } from "./db";
import { facebookAPI } from "./facebook";
import { decrypt } from "./encryption";

export async function resubscribeAllPagesToWebhooks() {
  try {
    console.log("🔄 Checking webhook subscriptions for all Facebook pages...");

    const pages = await db.pageConnection.findMany({
      select: {
        id: true,
        pageId: true,
        pageName: true,
        pageAccessTokenEnc: true,
        subscribed: true,
      },
    });

    if (pages.length === 0) {
      console.log("ℹ️  No Facebook pages connected");
      return;
    }

    console.log(`📋 Found ${pages.length} Facebook page(s)`);

    let successCount = 0;
    let failCount = 0;

    for (const page of pages) {
      try {
        const accessToken = await decrypt(page.pageAccessTokenEnc);

        // Check current subscription status
        const checkResponse = await fetch(
          `https://graph.facebook.com/v23.0/${page.pageId}/subscribed_apps?access_token=${accessToken}`
        );

        if (!checkResponse.ok) {
          console.warn(`⚠️  ${page.pageName}: Could not check subscription status`);
          failCount++;
          continue;
        }

        const checkData = await checkResponse.json();
        const isSubscribed = checkData.data && checkData.data.length > 0;

        if (isSubscribed) {
          const fields = checkData.data[0].subscribed_fields || [];
          if (fields.includes('messages')) {
            console.log(`✅ ${page.pageName}: Already subscribed (${fields.join(', ')})`);
            successCount++;

            // Update database if it says not subscribed
            if (!page.subscribed) {
              await db.pageConnection.update({
                where: { id: page.id },
                data: { subscribed: true },
              });
            }
            continue;
          }
        }

        // Not subscribed or missing messages field - subscribe now
        console.log(`🔧 ${page.pageName}: Subscribing to webhooks...`);

        await facebookAPI.subscribePageToWebhook(page.pageId, accessToken, [
          "messages",
          "messaging_postbacks",
          "message_deliveries",
          "message_reads",
        ]);

        // Update database
        await db.pageConnection.update({
          where: { id: page.id },
          data: { subscribed: true },
        });

        console.log(`✅ ${page.pageName}: Successfully subscribed`);
        successCount++;

      } catch (error) {
        console.error(`❌ ${page.pageName}: Failed to subscribe -`, error instanceof Error ? error.message : String(error));
        failCount++;
      }
    }

    console.log(`\n📊 Webhook subscription status: ${successCount} subscribed, ${failCount} failed\n`);

  } catch (error) {
    console.error("❌ Error in resubscribeAllPagesToWebhooks:", error);
  }
}

// Auto-run when server starts (but only in production)
if (process.env.NODE_ENV === "production") {
  // Delay to let database connection establish
  setTimeout(() => {
    resubscribeAllPagesToWebhooks().catch(console.error);
  }, 5000);
}

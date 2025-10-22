import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";
import { db } from "@/lib/db";
import { facebookAPI } from "@/lib/facebook";
import { decrypt } from "@/lib/encryption";

export async function POST(request: NextRequest) {
  try {
    console.log("🔌 Disconnect all pages request received");

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.error("❌ No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageSettings(session.user.role)) {
      console.error("❌ User doesn't have permission:", session.user.role);
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!session.user.companyId) {
      console.error("❌ No company associated with user");
      return NextResponse.json(
        { error: "No company associated" },
        { status: 400 }
      );
    }

    // Find all page connections for this company
    const pageConnections = await db.pageConnection.findMany({
      where: {
        companyId: session.user.companyId,
      },
    });

    if (pageConnections.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pages to disconnect",
        disconnectedCount: 0,
      });
    }

    console.log(`🔄 Found ${pageConnections.length} page connections to disconnect`);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Disconnect each page
    for (const pageConnection of pageConnections) {
      try {
        // Try to unsubscribe from Facebook webhook if the page is currently subscribed
        if (pageConnection.subscribed) {
          try {
            console.log(`🔄 Attempting to unsubscribe page ${pageConnection.pageId} from Facebook webhook`);
            const decryptedToken = await decrypt(pageConnection.pageAccessTokenEnc);
            await facebookAPI.unsubscribePageFromWebhook(decryptedToken);
            console.log(`✅ Successfully unsubscribed page ${pageConnection.pageId} from Facebook webhook`);
          } catch (webhookError) {
            console.warn(`⚠️ Could not unsubscribe page ${pageConnection.pageId} from Facebook webhook:`, webhookError);
            // Continue with disconnection even if webhook unsubscription fails
          }
        }

        // Delete the page connection (cascade delete will handle related data)
        await db.pageConnection.delete({
          where: {
            id: pageConnection.id,
          },
        });

        console.log(`✅ Page connection ${pageConnection.pageId} deleted successfully`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed to disconnect page ${pageConnection.pageId}:`, error);
        errors.push(`Failed to disconnect ${pageConnection.pageName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }

    console.log(`✅ Disconnect all completed. Success: ${successCount}, Errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      message: `Disconnected ${successCount} pages successfully`,
      disconnectedCount: successCount,
      errorCount,
      errors: errorCount > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("❌ Disconnect all pages error:", error);

    return NextResponse.json(
      { error: "Failed to disconnect pages" },
      { status: 500 }
    );
  }
}

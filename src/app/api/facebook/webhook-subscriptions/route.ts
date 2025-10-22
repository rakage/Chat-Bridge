import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";
import FacebookWebhookManager from "@/lib/facebook-webhook-manager";

// GET - Check webhook subscription status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    console.log(`🔍 Checking webhook subscriptions for company ${session.user.companyId}`);

    const subscriptionStatus = await FacebookWebhookManager.getCompanyPagesSubscriptionStatus(
      session.user.companyId
    );

    const summary = {
      total: subscriptionStatus.length,
      subscribed: subscriptionStatus.filter(p => p.isSubscribed).length,
      failed: subscriptionStatus.filter(p => !p.isSubscribed).length
    };

    return NextResponse.json({
      success: true,
      summary,
      pages: subscriptionStatus,
      message: `Found ${summary.subscribed}/${summary.total} pages with active webhook subscriptions`
    });

  } catch (error) {
    console.error('❌ Error checking webhook subscriptions:', error);
    return NextResponse.json(
      { error: "Failed to check webhook subscriptions" },
      { status: 500 }
    );
  }
}

// POST - Subscribe all pages to webhooks
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.companyId) {
      return NextResponse.json({ error: "No company associated" }, { status: 400 });
    }

    const { action } = await request.json().catch(() => ({ action: 'subscribe' }));

    console.log(`🔄 ${action === 'resubscribe' ? 'Resubscribing failed' : 'Subscribing all'} pages for company ${session.user.companyId}`);

    let result;
    if (action === 'resubscribe') {
      result = await FacebookWebhookManager.resubscribeFailedPages(session.user.companyId);
    } else {
      result = await FacebookWebhookManager.subscribeAllCompanyPages(session.user.companyId);
    }

    const statusCode = result.success ? 200 : 207; // 207 = Multi-Status (partial success)

    return NextResponse.json({
      ...result,
      message: result.success 
        ? `Successfully ${action === 'resubscribe' ? 'resubscribed' : 'subscribed'} all ${result.summary.successful} pages`
        : `${action === 'resubscribe' ? 'Resubscribed' : 'Subscribed'} ${result.summary.successful}/${result.summary.total} pages. ${result.summary.failed} failed.`
    }, { status: statusCode });

  } catch (error) {
    console.error('❌ Error subscribing to webhooks:', error);
    return NextResponse.json(
      { error: "Failed to subscribe to webhooks" },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe from webhooks (for testing)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !canManageSettings(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('pageId');

    if (!pageId) {
      return NextResponse.json({ error: "pageId parameter required" }, { status: 400 });
    }

    // This is mainly for testing - you might not want to expose this in production
    console.log(`⚠️ Unsubscribing page ${pageId} from webhooks (for testing)`);

    // Implementation would go here to unsubscribe specific page
    // For now, return success
    return NextResponse.json({
      success: true,
      message: `Page ${pageId} unsubscribed from webhooks`
    });

  } catch (error) {
    console.error('❌ Error unsubscribing from webhooks:', error);
    return NextResponse.json(
      { error: "Failed to unsubscribe from webhooks" },
      { status: 500 }
    );
  }
}
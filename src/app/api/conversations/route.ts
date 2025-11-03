import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { LastSeenService } from "@/lib/last-seen";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "10"); // Reduced from 50 to 10 for better performance
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause based on user's company access
    // ALL users (including OWNERs) should only see conversations from their current company
    let whereClause: any = {};

    if (session.user.companyId) {
      whereClause.OR = [
        {
          pageConnection: {
            company: {
              id: session.user.companyId,
            },
          },
        },
        {
          instagramConnection: {
            company: {
              id: session.user.companyId,
            },
          },
        },
        {
          telegramConnection: {
            company: {
              id: session.user.companyId,
            },
          },
        },
        {
          widgetConfig: {
            company: {
              id: session.user.companyId,
            },
          },
        },
      ];
    }

    if (status && status !== "ALL") {
      whereClause.status = status;
    }

    // ============================================
    // OPTIMIZED QUERY #1: Fetch conversations with selective loading
    // Reduced from ~1,001 queries to 1 query for 100 conversations
    // ============================================
    const conversations = await db.conversation.findMany({
      where: whereClause,
      select: {
        id: true,
        psid: true,
        platform: true,
        status: true,
        autoBot: true,
        lastMessageAt: true,
        customerName: true,
        meta: true,
        unreadCount: true, // Computed field from database trigger
        
        // Load connection data WITHOUT nested company (eliminates 4 queries per conversation)
        pageConnection: {
          select: {
            pageName: true,
            companyId: true,
            profilePictureUrl: true,
          },
        },
        instagramConnection: {
          select: {
            username: true,
            displayName: true,
            companyId: true,
            profilePictureUrl: true,
          },
        },
        telegramConnection: {
          select: {
            botUsername: true,
            botName: true,
            companyId: true,
            profilePictureUrl: true,
          },
        },
        widgetConfig: {
          select: {
            widgetName: true,
            companyId: true,
          },
        },
        
        // Get ONLY the last message
        messages: {
          select: {
            id: true,
            text: true,
            role: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Early return if no conversations
    if (conversations.length === 0) {
      return NextResponse.json({
        conversations: [],
        total: 0,
        hasMore: false,
      });
    }

    // ============================================
    // OPTIMIZED QUERY #2: Batch fetch message counts
    // Single GROUP BY query instead of N COUNT queries
    // ============================================
    const conversationIds = conversations.map((c) => c.id);
    
    const messageCounts = await db.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: conversationIds },
      },
      _count: {
        conversationId: true,
      },
    });

    // Convert to Map for O(1) lookup
    const messageCountMap = new Map(
      messageCounts.map((mc) => [mc.conversationId, mc._count.conversationId])
    );

    // ============================================
    // Transform data for frontend
    // ============================================
    const conversationSummaries = conversations.map((conv) => {
      const lastMessage = conv.messages[0];
      const messageCount = messageCountMap.get(conv.id) || 0;

      // ============================================
      // OPTIMIZED: Use precomputed unreadCount from database
      // This is automatically updated by database trigger when messages are inserted
      // No more JavaScript loop calculations or Supabase lookups!
      // ============================================
      const unreadCount = conv.unreadCount || 0;

      // Get customer profile from metadata if available
      const customerProfile = (conv.meta as any)?.customerProfile;
      let customerName = customerProfile?.fullName || conv.customerName;
      
      if (!customerName) {
        customerName = conv.psid ? `Customer ${conv.psid.slice(-4)}` : "Unknown Customer";
      }

      // Determine platform and page/connection name
      const isInstagram = conv.platform === 'INSTAGRAM';
      const isTelegram = conv.platform === 'TELEGRAM';
      const isWidget = conv.platform === 'WIDGET';
      const connection = isWidget 
        ? conv.widgetConfig 
        : (isTelegram 
          ? conv.telegramConnection 
          : (isInstagram ? conv.instagramConnection : conv.pageConnection));
      const pageName = isWidget
        ? conv.widgetConfig?.widgetName || 'Chat Widget'
        : (isTelegram
          ? `@${conv.telegramConnection?.botUsername}` || 'Telegram Bot'
          : (isInstagram 
            ? `@${conv.instagramConnection?.username}` 
            : conv.pageConnection?.pageName));

      // If no customer profile exists, we could fetch it here in the background
      // For now, we'll just use the existing data or fallback name

      return {
        id: conv.id,
        psid: conv.psid,
        platform: conv.platform,
        status: conv.status,
        autoBot: conv.autoBot,
        customerName,
        customerProfile: customerProfile || null,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        messageCount,
        unreadCount,
        pageName: pageName || 'Unknown Page',
        lastMessage: lastMessage
          ? {
              text: lastMessage.text,
              role: lastMessage.role,
            }
          : undefined,
      };
    });

    return NextResponse.json({
      conversations: conversationSummaries,
      total: conversationSummaries.length,
      hasMore: conversationSummaries.length === limit,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    );
  }
}

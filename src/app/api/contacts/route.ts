import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!session.user.companyId) {
      return NextResponse.json(
        { error: "User must be associated with a company" },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const platform = searchParams.get("platform") || "ALL";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause for conversations
    let whereClause: any = {
      // Company filter - user must have access to this company's conversations
      OR: [
        { pageConnection: { companyId: session.user.companyId } },
        { instagramConnection: { companyId: session.user.companyId } },
        { telegramConnection: { companyId: session.user.companyId } },
        { widgetConfig: { companyId: session.user.companyId } },
      ],
    };

    // Filter by platform
    if (platform !== "ALL") {
      whereClause.platform = platform;
    }

    // Search by customer name or email (use AND logic with company filter)
    if (search) {
      whereClause.AND = [
        {
          OR: [
            {
              customerName: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              customerEmail: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        },
      ];
    }

    // Fetch conversations with customer data
    const conversations = await db.conversation.findMany({
      where: whereClause,
      select: {
        id: true,
        psid: true,
        platform: true,
        status: true,
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        customerAddress: true,
        lastMessageAt: true,
        createdAt: true,
        meta: true,
        unreadCount: true,
        
        // Platform connection data
        pageConnection: {
          select: {
            pageName: true,
            profilePictureUrl: true,
          },
        },
        instagramConnection: {
          select: {
            username: true,
            displayName: true,
            profilePictureUrl: true,
          },
        },
        telegramConnection: {
          select: {
            botUsername: true,
            botName: true,
            profilePictureUrl: true,
          },
        },
        widgetConfig: {
          select: {
            widgetName: true,
          },
        },

        // Get message count
        messages: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    // Group by unique customer (psid)
    const contactsMap = new Map();

    for (const conv of conversations) {
      // Use psid as unique identifier
      if (!contactsMap.has(conv.psid)) {
        const customerProfile = (conv.meta as any)?.customerProfile;
        let customerName = customerProfile?.fullName || conv.customerName;
        
        if (!customerName) {
          customerName = conv.psid ? `Customer ${conv.psid.slice(-4)}` : "Unknown Customer";
        }

        // Get platform info
        const isInstagram = conv.platform === 'INSTAGRAM';
        const isTelegram = conv.platform === 'TELEGRAM';
        const isWidget = conv.platform === 'WIDGET';
        
        const platformName = isWidget 
          ? conv.widgetConfig?.widgetName || 'Chat Widget'
          : (isTelegram
            ? `@${conv.telegramConnection?.botUsername}` || 'Telegram Bot'
            : (isInstagram 
              ? `@${conv.instagramConnection?.username}` 
              : conv.pageConnection?.pageName));

        const profilePicture = isWidget
          ? null
          : (isTelegram
            ? conv.telegramConnection?.profilePictureUrl
            : (isInstagram
              ? conv.instagramConnection?.profilePictureUrl
              : conv.pageConnection?.profilePictureUrl));

        contactsMap.set(conv.psid, {
          id: conv.id,
          psid: conv.psid,
          platform: conv.platform,
          customerName,
          customerEmail: conv.customerEmail,
          customerPhone: conv.customerPhone,
          customerAddress: conv.customerAddress,
          profilePicture: customerProfile?.profilePicture || profilePicture,
          lastMessageAt: conv.lastMessageAt,
          createdAt: conv.createdAt,
          messageCount: conv.messages.length,
          conversationId: conv.id,
          platformName,
          unreadCount: conv.unreadCount || 0,
        });
      }
    }

    const contacts = Array.from(contactsMap.values());

    // Count total unique contacts
    const totalUnique = await db.conversation.groupBy({
      by: ['psid'],
      where: whereClause,
    });

    return NextResponse.json({
      contacts,
      total: totalUnique.length,
      hasMore: offset + limit < totalUnique.length,
    });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

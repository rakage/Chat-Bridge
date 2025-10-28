import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { facebookAPI } from "@/lib/facebook";
import { decrypt } from "@/lib/encryption";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: conversationId } = await params;
    
    // Check if force refresh is requested (e.g., when profile photo fails to load)
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh = searchParams.get('force') === 'true';

    // Get conversation with page connection info
    const conversation = await db.conversation.findUnique({
      where: { id: conversationId },
      include: {
        pageConnection: {
          include: {
            company: true,
          },
        },
        instagramConnection: {
          include: {
            company: true,
          },
        },
        telegramConnection: {
          include: {
            company: true,
          },
        },
        widgetConfig: {
          include: {
            company: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check access permissions - handle Facebook, Instagram, Telegram, and Widget
    const company = conversation.pageConnection?.company || conversation.instagramConnection?.company || conversation.telegramConnection?.company || conversation.widgetConfig?.company;
    if (!company) {
      return NextResponse.json({ error: "Company not found for conversation" }, { status: 404 });
    }
    
    if (session.user.companyId !== company.id && session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if we have cached profile data (skip if force refresh)
    const cachedProfile = conversation.meta as any;
    if (
      !forceRefresh &&
      cachedProfile?.customerProfile?.cached &&
      cachedProfile?.customerProfile?.cachedAt
    ) {
      const cacheAge =
        Date.now() - new Date(cachedProfile.customerProfile.cachedAt).getTime();
      // Cache for 24 hours
      if (cacheAge < 24 * 60 * 60 * 1000) {
        console.log(`📦 Returning cached profile (age: ${Math.floor(cacheAge / 1000 / 60)} minutes)`);
        return NextResponse.json({
          profile: cachedProfile.customerProfile,
          source: "cache",
        });
      }
    }
    
    if (forceRefresh) {
      console.log(`🔄 Force refresh requested for conversation ${conversationId}`);
    }

    // For Widget, return customer info from conversation
    if (conversation.platform === 'WIDGET') {
      // Return cached Widget profile if available
      if (cachedProfile?.customerProfile) {
        return NextResponse.json({
          profile: cachedProfile.customerProfile,
          source: "cache",
        });
      }
      
      // Create widget profile from conversation data
      const widgetProfile = {
        id: conversation.psid,
        firstName: conversation.customerName?.split(' ')[0] || "Website",
        lastName: conversation.customerName?.split(' ').slice(1).join(' ') || "Visitor",
        fullName: conversation.customerName || `Website Visitor #${conversation.psid.slice(-4)}`,
        profilePicture: null,
        locale: "en_US",
        email: conversation.customerEmail || undefined,
        phone: conversation.customerPhone || undefined,
        address: conversation.customerAddress || undefined,
        platform: "widget",
        cached: true,
        cachedAt: new Date().toISOString(),
      };
      
      // Cache the profile
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          meta: {
            ...((conversation.meta as any) || {}),
            customerProfile: widgetProfile,
          },
        },
      });
      
      return NextResponse.json({
        profile: widgetProfile,
        source: "widget",
      });
    }
    
    // For Telegram, return customer info from conversation
    if (conversation.platform === 'TELEGRAM') {
      // Return cached Telegram profile if available
      if (cachedProfile?.customerProfile) {
        return NextResponse.json({
          profile: cachedProfile.customerProfile,
          source: "cache",
        });
      }
      
      // Get Telegram user info from conversation meta and customerName
      const telegramMeta = conversation.meta as any;
      const telegramUsername = telegramMeta?.username;
      const telegramUserId = telegramMeta?.telegramUserId || conversation.psid;
      
      // Use customerName from conversation (set during webhook)
      const fullName = conversation.customerName || `Telegram User #${conversation.psid.slice(-4)}`;
      const nameParts = fullName.split(' ');
      
      const telegramProfile = {
        id: conversation.psid,
        firstName: nameParts[0] || "Telegram",
        lastName: nameParts.slice(1).join(' ') || "User",
        fullName: fullName,
        profilePicture: null,
        locale: "en_US",
        telegramUsername: telegramUsername,
        telegramUserId: telegramUserId,
        email: conversation.customerEmail || undefined,
        phone: conversation.customerPhone || undefined,
        address: conversation.customerAddress || undefined,
        platform: "telegram",
        cached: true,
        cachedAt: new Date().toISOString(),
      };
      
      // Cache the profile
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          meta: {
            ...((conversation.meta as any) || {}),
            customerProfile: telegramProfile,
          },
        },
      });
      
      return NextResponse.json({
        profile: telegramProfile,
        source: "telegram",
      });
    }
    
    // For Instagram, we can't fetch profile from API, return cached or default
    if (conversation.platform === 'INSTAGRAM') {
      // Return cached Instagram profile if available
      if (cachedProfile?.customerProfile) {
        return NextResponse.json({
          profile: cachedProfile.customerProfile,
          source: "cache",
        });
      }
      
      // Try to get Instagram username from conversation data
      const instagramUsername = conversation.customerName || `ig_user_${conversation.psid.slice(-4)}`;
      const instagramProfile = {
        id: conversation.psid,
        firstName: instagramUsername.split(' ')[0] || "Instagram",
        lastName: instagramUsername.split(' ').slice(1).join(' ') || "User",
        fullName: instagramUsername,
        profilePicture: null,
        locale: "en_US",
        instagramUrl: `https://www.instagram.com/direct/t/${conversation.psid}`,
        email: conversation.customerEmail || undefined,
        phone: conversation.customerPhone || undefined,
        address: conversation.customerAddress || undefined,
        platform: "instagram",
        cached: true,
        cachedAt: new Date().toISOString(),
      };
      
      // Cache the profile
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          meta: {
            ...((conversation.meta as any) || {}),
            customerProfile: instagramProfile,
          },
        },
      });
      
      return NextResponse.json({
        profile: instagramProfile,
        source: "default",
      });
    }
    
    // Facebook profile fetching
    try {
      // Decrypt page access token
      const pageAccessToken = await decrypt(
        conversation.pageConnection!.pageAccessTokenEnc
      );

      // Fetch user profile from Facebook
      const profile = await facebookAPI.getUserProfile(
        conversation.psid,
        pageAccessToken,
        ["first_name", "last_name", "profile_pic", "locale"]
      );

      // Enhanced profile data
      const enhancedProfile = {
        id: conversation.psid,
        firstName: profile.first_name || "Unknown",
        lastName: profile.last_name || "",
        fullName: `${profile.first_name || "Unknown"} ${
          profile.last_name || ""
        }`.trim(),
        profilePicture: profile.profile_pic || null,
        locale: profile.locale || "en_US",
        facebookUrl: `https://www.facebook.com/${conversation.psid}`,
        cached: true,
        cachedAt: new Date().toISOString(),
      };

      // Cache the profile data in conversation metadata
      await db.conversation.update({
        where: { id: conversationId },
        data: {
          meta: {
            ...((conversation.meta as any) || {}),
            customerProfile: enhancedProfile,
          },
        },
      });
      return NextResponse.json({
        profile: enhancedProfile,
        source: "facebook_api",
      });
    } catch (facebookError) {
      console.error("Facebook API error:", facebookError);

      // Return fallback profile data
      const fallbackProfile = {
        id: conversation.psid,
        firstName: "Customer",
        lastName: `#${conversation.psid.slice(-4)}`,
        fullName: `Customer #${conversation.psid.slice(-4)}`,
        profilePicture: null,
        locale: "en_US",
        facebookUrl: `https://www.facebook.com/${conversation.psid}`,
        cached: false,
        error: "Facebook API unavailable",
      };

      return NextResponse.json({
        profile: fallbackProfile,
        source: "fallback",
        error: "Could not fetch from Facebook API",
      });
    }
  } catch (error) {
    console.error("Error fetching customer profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer profile" },
      { status: 500 }
    );
  }
}

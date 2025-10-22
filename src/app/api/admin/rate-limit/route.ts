import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getRateLimitStats,
  resetRateLimit,
  addToWhitelist,
  removeFromWhitelist,
  addToBlacklist,
  removeFromBlacklist,
  RateLimitType,
} from "@/lib/rate-limit";

// GET - Get rate limit statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin/owner
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin or Owner role required." },
        { status: 403 }
      );
    }

    // Get rate limit statistics
    const stats = await getRateLimitStats();

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching rate limit stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch rate limit statistics" },
      { status: 500 }
    );
  }
}

// POST - Manage rate limit (reset, whitelist, blacklist)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin/owner
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin or Owner role required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, identifier, limitType } = body;

    if (!action || !identifier) {
      return NextResponse.json(
        { error: "Action and identifier are required" },
        { status: 400 }
      );
    }

    let result: any = { success: true };

    switch (action) {
      case "reset":
        await resetRateLimit(identifier, limitType as RateLimitType);
        result.message = `Rate limit reset for ${identifier}`;
        console.log(`🔄 Admin ${session.user.email} reset rate limit for ${identifier}`);
        break;

      case "whitelist_add":
        await addToWhitelist(identifier);
        result.message = `Added ${identifier} to whitelist`;
        console.log(`✅ Admin ${session.user.email} whitelisted ${identifier}`);
        break;

      case "whitelist_remove":
        await removeFromWhitelist(identifier);
        result.message = `Removed ${identifier} from whitelist`;
        console.log(`➖ Admin ${session.user.email} removed ${identifier} from whitelist`);
        break;

      case "blacklist_add":
        await addToBlacklist(identifier);
        result.message = `Added ${identifier} to blacklist`;
        console.log(`⛔ Admin ${session.user.email} blacklisted ${identifier}`);
        break;

      case "blacklist_remove":
        await removeFromBlacklist(identifier);
        result.message = `Removed ${identifier} from blacklist`;
        console.log(`✅ Admin ${session.user.email} removed ${identifier} from blacklist`);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action. Valid actions: reset, whitelist_add, whitelist_remove, blacklist_add, blacklist_remove" },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error managing rate limit:", error);
    return NextResponse.json(
      { error: "Failed to manage rate limit" },
      { status: 500 }
    );
  }
}

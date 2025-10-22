import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";
import { facebookOAuth } from "@/lib/facebook-oauth";

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Facebook login URL request received");

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

    // Generate a unique state parameter for CSRF protection
    const state = `${session.user.id}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Generate Facebook OAuth URL
    const loginUrl = facebookOAuth.getLoginUrl(state);

    console.log("✅ Facebook login URL generated successfully");

    return NextResponse.json({
      loginUrl,
      state,
    });
  } catch (error) {
    console.error("❌ Error generating Facebook login URL:", error);
    return NextResponse.json(
      { error: "Failed to generate login URL" },
      { status: 500 }
    );
  }
}

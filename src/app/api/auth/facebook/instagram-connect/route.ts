import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Facebook-based Instagram connection endpoint
 * This uses Facebook Login to get tokens that can access the correct Instagram Business Account IDs
 */
export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Facebook-based Instagram connection request received");

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.error("❌ No user session found");
      return NextResponse.redirect(
        new URL("/auth/login?error=Please login first", request.url)
      );
    }

    // Generate Facebook OAuth URL with Instagram permissions
    const facebookAppId = process.env.FACEBOOK_APP_ID;
    const redirectUri = encodeURIComponent(`${process.env.NEXTAUTH_URL}/api/auth/facebook/instagram-callback`);
    
    const facebookOAuthUrl = new URL("https://www.facebook.com/v18.0/dialog/oauth");
    facebookOAuthUrl.searchParams.set("client_id", facebookAppId!);
    facebookOAuthUrl.searchParams.set("redirect_uri", redirectUri);
    facebookOAuthUrl.searchParams.set("response_type", "code");
    facebookOAuthUrl.searchParams.set("scope", [
      "pages_show_list", 
      "instagram_basic",
      "instagram_manage_messages"
    ].join(","));
    facebookOAuthUrl.searchParams.set("state", `${session.user.id}_${Date.now()}_instagram`);

    console.log("✅ Redirecting to Facebook OAuth for Instagram Business Account access");
    
    return NextResponse.redirect(facebookOAuthUrl.toString());

  } catch (error) {
    console.error("❌ Facebook Instagram connect error:", error);
    return NextResponse.redirect(
      new URL("/dashboard/integrations?error=Failed to connect Instagram via Facebook", request.url)
    );
  }
}
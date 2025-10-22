import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions, canManageSettings } from "@/lib/auth";
import { facebookOAuth } from "@/lib/facebook-oauth";

export async function GET(request: NextRequest) {
  try {
    console.log("🔄 Facebook Business Login URL request received");

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

    // Get configuration ID from query parameters
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get("config_id");

    if (!configId) {
      console.error("❌ Missing config_id parameter");
      return NextResponse.json(
        { error: "config_id parameter is required for business login" },
        { status: 400 }
      );
    }

    // Generate a unique state parameter for CSRF protection
    const state = `${session.user.id}_${Date.now()}_business_${Math.random().toString(36).substring(2, 15)}`;
    
    // Configure Facebook Login for Business
    const businessConfig = {
      config_id: configId,
      response_type: 'code' as const,
      override_default_response_type: true,
    };
    
    // Generate Facebook Business Login URL
    const loginUrl = facebookOAuth.getBusinessLoginUrl(businessConfig, state);

    console.log("✅ Facebook Business Login URL generated successfully");
    console.log("🔍 Config ID:", configId);

    return NextResponse.json({
      loginUrl,
      state,
      config_id: configId,
      business_login: true,
    });
  } catch (error) {
    console.error("❌ Error generating Facebook Business Login URL:", error);
    return NextResponse.json(
      { error: "Failed to generate business login URL" },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// This endpoint logs what data is being sent to connect-oauth
// to debug why connecting Rakage breaks Dian Aul

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    
    console.log("🔍 DEBUG: Pages being sent to connect:");
    console.log("Number of pages:", body.pages?.length || 0);
    
    if (body.pages) {
      body.pages.forEach((page: any, index: number) => {
        console.log(`\nPage ${index + 1}:`);
        console.log(`  Name: ${page.name}`);
        console.log(`  ID: ${page.id}`);
        console.log(`  Has access_token: ${!!page.access_token}`);
        console.log(`  Token preview: ${page.access_token ? page.access_token.substring(0, 20) + '...' : 'none'}`);
      });
    }

    return NextResponse.json({
      message: "Debug info logged to console",
      pageCount: body.pages?.length || 0,
      pageNames: body.pages?.map((p: any) => p.name) || [],
    });

  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

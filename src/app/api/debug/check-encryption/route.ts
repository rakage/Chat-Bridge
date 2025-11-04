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

    const pages = await db.pageConnection.findMany({
      where: {
        companyId: session.user.companyId || undefined,
      },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        pageAccessTokenEnc: true,
      },
    });

    const results = pages.map(page => ({
      pageName: page.pageName,
      pageId: page.pageId,
      encryptedTokenPreview: page.pageAccessTokenEnc.substring(0, 50) + '...',
      encryptedTokenLength: page.pageAccessTokenEnc.length,
      hasColonSeparator: page.pageAccessTokenEnc.includes(':'),
      format: page.pageAccessTokenEnc.includes(':') 
        ? 'Old format (nonce:ciphertext)' 
        : 'New format (base64 combined)',
    }));

    return NextResponse.json({
      message: `Checked ${pages.length} page(s)`,
      pages: results,
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log('📋 Checking Facebook Page Access Token Permissions...\n');

    const pages = await db.pageConnection.findMany({
      where: {
        companyId: session.user.companyId || undefined,
      },
      select: {
        id: true,
        pageId: true,
        pageName: true,
        pageAccessTokenEnc: true,
        companyId: true,
      },
    });

    if (pages.length === 0) {
      return NextResponse.json({
        message: "No Facebook pages connected",
        pages: [],
      });
    }

    const results = [];

    for (const page of pages) {
      const pageResult: any = {
        pageName: page.pageName,
        pageId: page.pageId,
        dbId: page.id,
      };

      try {
        // Decrypt the access token
        const accessToken = await decrypt(page.pageAccessTokenEnc);

        // Check token info using Facebook Debug Token API
        const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
        const debugResponse = await fetch(
          `https://graph.facebook.com/v23.0/debug_token?input_token=${accessToken}&access_token=${appToken}`
        );

        if (!debugResponse.ok) {
          const error = await debugResponse.text();
          pageResult.error = `Error checking token: ${error}`;
          results.push(pageResult);
          continue;
        }

        const debugData = await debugResponse.json();
        const tokenData = debugData.data;

        pageResult.tokenStatus = tokenData.is_valid ? 'Valid' : 'Invalid';
        pageResult.tokenType = tokenData.type;
        pageResult.expires = tokenData.expires_at 
          ? new Date(tokenData.expires_at * 1000).toISOString()
          : 'Never (long-lived)';

        if (tokenData.scopes) {
          pageResult.grantedPermissions = tokenData.scopes;
          
          const requiredPermissions = ['pages_messaging', 'pages_manage_metadata', 'pages_show_list'];
          const missingPermissions = requiredPermissions.filter(
            (perm) => !tokenData.scopes.includes(perm)
          );

          pageResult.requiredPermissions = requiredPermissions;
          pageResult.missingPermissions = missingPermissions;
          pageResult.hasAllRequiredPermissions = missingPermissions.length === 0;

          if (missingPermissions.length > 0) {
            pageResult.warning = `Missing required permissions: ${missingPermissions.join(', ')}`;
            pageResult.actionRequired = 'Reconnect this page to grant missing permissions';
          }
        }

        // Try to fetch page info to verify the token works
        const pageInfoResponse = await fetch(
          `https://graph.facebook.com/v23.0/${page.pageId}?fields=id,name,category&access_token=${accessToken}`
        );

        if (pageInfoResponse.ok) {
          const pageInfo = await pageInfoResponse.json();
          pageResult.pageInfoTest = 'Token can access page data';
          pageResult.category = pageInfo.category || 'N/A';
        } else {
          pageResult.pageInfoTest = 'Token cannot access page data';
        }

        results.push(pageResult);

      } catch (error) {
        pageResult.error = error instanceof Error ? error.message : String(error);
        results.push(pageResult);
      }
    }

    return NextResponse.json({
      message: `Checked ${pages.length} page(s)`,
      pages: results,
      summary: {
        total: results.length,
        withAllPermissions: results.filter(p => p.hasAllRequiredPermissions).length,
        withMissingPermissions: results.filter(p => p.missingPermissions && p.missingPermissions.length > 0).length,
      },
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

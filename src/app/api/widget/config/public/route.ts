import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// CORS headers for widget (public endpoint)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: 'Missing companyId' },
        { status: 400, headers: corsHeaders }
      );
    }

    const widgetConfig = await db.widgetConfig.findUnique({
      where: { companyId },
    });

    if (!widgetConfig || !widgetConfig.enabled) {
      return NextResponse.json(
        { error: 'Widget not enabled' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Return only public configuration (no sensitive data)
    return NextResponse.json({
      config: {
        primaryColor: widgetConfig.primaryColor,
        accentColor: widgetConfig.accentColor,
        welcomeMessage: widgetConfig.welcomeMessage,
        placeholderText: widgetConfig.placeholderText,
        position: widgetConfig.position,
        autoOpen: widgetConfig.autoOpen,
        autoOpenDelay: widgetConfig.autoOpenDelay,
        widgetName: widgetConfig.widgetName,
        requireEmail: widgetConfig.requireEmail,
        allowedDomains: widgetConfig.allowedDomains || [],
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Get public widget config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

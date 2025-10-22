import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { z } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email! },
      include: { company: true },
    });

    if (!user?.companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    let widgetConfig = await db.widgetConfig.findUnique({
      where: { companyId: user.companyId },
    });

    if (!widgetConfig) {
      widgetConfig = await db.widgetConfig.create({
        data: {
          companyId: user.companyId,
        },
      });
    }

    return NextResponse.json(widgetConfig);
  } catch (error) {
    console.error('Get widget config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validation schema for widget config
const widgetConfigSchema = z.object({
  widgetName: z.string().optional(),
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  welcomeMessage: z.string().optional(),
  placeholderText: z.string().optional(),
  position: z.string().optional(),
  autoOpen: z.boolean().optional(),
  autoOpenDelay: z.number().optional(),
  autoBot: z.boolean().optional(), // Added autoBot field
  enabled: z.boolean().optional(),
  allowedDomains: z.array(z.string()).optional(),
  collectName: z.boolean().optional(),
  collectEmail: z.boolean().optional(),
  collectPhone: z.boolean().optional(),
  requireEmail: z.boolean().optional(),
  showPoweredBy: z.boolean().optional(),
  customCss: z.string().nullable().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user?.companyId) {
      return NextResponse.json({ error: 'No company found' }, { status: 404 });
    }

    const body = await req.json();
    
    // Validate the data
    const validation = widgetConfigSchema.safeParse(body);
    if (!validation.success) {
      console.error('Widget config validation error:', validation.error);
      return NextResponse.json(
        { error: 'Invalid widget configuration', details: validation.error.issues },
        { status: 400 }
      );
    }

    const data = validation.data;

    const widgetConfig = await db.widgetConfig.upsert({
      where: { companyId: user.companyId },
      update: data,
      create: {
        ...data,
        companyId: user.companyId,
      },
    });

    console.log(`✅ Widget config updated for company ${user.companyId}`, {
      autoBot: widgetConfig.autoBot,
      enabled: widgetConfig.enabled,
    });

    // Emit configuration update event to all widgets for this company
    try {
      const io = (global as any).socketIO;
      if (io) {
        io.to(`company:${user.companyId}`).emit('widget:config-updated', {
          companyId: user.companyId,
          timestamp: new Date().toISOString(),
        });
        console.log(`✅ Emitted widget:config-updated event to company ${user.companyId}`);
      }
    } catch (socketError) {
      console.error('Failed to emit config update event:', socketError);
    }

    return NextResponse.json(widgetConfig);
  } catch (error) {
    console.error('Update widget config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

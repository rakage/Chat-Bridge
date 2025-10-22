import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Missing conversationId' },
        { status: 400 }
      );
    }

    // Get Socket.io instance
    const io = (global as any).socketIO;
    if (!io) {
      return NextResponse.json({ isOnline: false, reason: 'Socket.io not initialized' });
    }

    // Check if there are any sockets in the conversation room with widget data
    const room = `conversation:${conversationId}`;
    const socketsInRoom = await io.in(room).fetchSockets();
    
    let isOnline = false;
    let lastHeartbeat = null;

    for (const socket of socketsInRoom) {
      // Check if this is a widget customer (has widgetSession data)
      if (socket.data.widgetConversationId === conversationId) {
        isOnline = true;
        lastHeartbeat = socket.data.lastHeartbeat || Date.now();
        
        // Check if heartbeat is recent (within last 60 seconds)
        const timeSinceHeartbeat = Date.now() - (lastHeartbeat || 0);
        if (timeSinceHeartbeat > 60000) {
          isOnline = false;
        }
        
        break;
      }
    }

    return NextResponse.json({
      isOnline,
      lastHeartbeat: lastHeartbeat ? new Date(lastHeartbeat).toISOString() : null,
      socketsInRoom: socketsInRoom.length,
    });
  } catch (error) {
    console.error('Widget presence check error:', error);
    return NextResponse.json({ isOnline: false, error: 'Failed to check presence' });
  }
}

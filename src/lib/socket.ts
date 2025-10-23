import { Server as HTTPServer } from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { db } from "./db";
import { canAccessCompany } from "./auth";

export type SocketWithAuth = Socket & {
  userId?: string;
  companyId?: string;
  role?: string;
};

class SocketService {
  private io: SocketIOServer | null = null;

  init(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3001",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      // Aggressive timeouts to survive browser tab throttling
      pingTimeout: 120000, // 2 minutes - very long to survive background tabs
      pingInterval: 30000, // 30 seconds - send ping every 30s
      connectTimeout: 60000, // 60 seconds connection timeout
      upgradeTimeout: 30000, // 30 seconds upgrade timeout
      maxHttpBufferSize: 1e6, // 1MB
      allowEIO3: true, // Allow Engine.IO v3 clients
      // Enable WebSocket compression for better performance
      perMessageDeflate: true,
      httpCompression: true,
    });

    this.io.use(async (socket: SocketWithAuth, next) => {
      try {
        // For now, skip authentication in development to fix real-time issues
        // TODO: Implement proper client-side token authentication later
        if (process.env.NODE_ENV === "development") {
          // Set dummy values for development
          socket.userId = "dev-user";
          socket.companyId = "dev-company";
          socket.role = "ADMIN";
          return next();
        }

        // Get session from the socket handshake (this won't work with client sockets)
        const session = await getServerSession(authOptions);

        if (!session?.user) {
          return next(new Error("Unauthorized"));
        }

        // Attach user info to socket
        socket.userId = session.user.id;
        socket.companyId = session.user.companyId || undefined;
        socket.role = session.user.role;

        next();
      } catch (error) {
        next(new Error("Authentication failed"));
      }
    });

    this.io.on("connection", (socket: SocketWithAuth) => {
      console.log(`✅ User ${socket.userId} connected (ID: ${socket.id})`);

      // Join user to their company room
      if (socket.companyId) {
        socket.join(`company:${socket.companyId}`);
        console.log(
          `✅ User ${socket.userId} joined company room: ${socket.companyId}`
        );
      }

      // For development: Join a global company room so all users get updates
      if (process.env.NODE_ENV === "development") {
        socket.join("company:dev-company");
        console.log(`✅ Development mode: User joined dev-company room`);
      }

      // Handle explicit join:company event from client
      socket.on("join:company", (companyId: string) => {
        socket.join(`company:${companyId}`);
        console.log(`✅ User ${socket.userId} manually joined company:${companyId}`);
        socket.emit("joined:company", { companyId, success: true });
      });

      // Handle joining conversation rooms
      socket.on("join:conversation", async (conversationId: string) => {
        try {
          // Verify user has access to this conversation
          const conversation = await db.conversation.findUnique({
            where: { id: conversationId },
            include: {
              pageConnection: {
                include: {
                  company: true,
                },
              },
              instagramConnection: {
                include: {
                  company: true,
                },
              },
            },
          });

          if (!conversation) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }

          // Check access permissions
          const company = conversation.pageConnection?.company || conversation.instagramConnection?.company;
          if (
            !company ||
            !canAccessCompany(
              socket.role as any,
              socket.companyId || null,
              company.id
            )
          ) {
            socket.emit("error", { message: "Access denied" });
            return;
          }

          socket.join(`conversation:${conversationId}`);
          console.log(
            `✅ User ${socket.userId} joined conversation:${conversationId}`
          );
          socket.emit("joined:conversation", { conversationId });
        } catch (error) {
          socket.emit("error", { message: "Failed to join conversation" });
        }
      });

      // Handle leaving conversation rooms
      socket.on("leave:conversation", (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        socket.emit("left:conversation", { conversationId });
      });

      // Handle typing indicators
      socket.on("typing:start", (data: { conversationId: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit("typing:start", {
          userId: socket.userId,
          conversationId: data.conversationId,
        });
      });

      socket.on("typing:stop", (data: { conversationId: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit("typing:stop", {
          userId: socket.userId,
          conversationId: data.conversationId,
        });
      });

      // Handle conversation view updates (real-time communication between ConversationView and ConversationsList)
      socket.on(
        "conversation:view-update",
        (data: {
          conversationId: string;
          type: "new_message" | "message_sent" | "bot_status_changed" | "typing_start" | "typing_stop";
          message?: { text: string; role: "USER" | "AGENT" | "BOT"; createdAt: string };
          lastMessageAt?: string;
          autoBot?: boolean;
          timestamp: string;
        }) => {
          console.log(
            `📡 Broadcasting conversation:view-update (${data.type}) for conversation ${data.conversationId}`
          );
          
          // Broadcast to all clients in the conversation room AND company room
          // This ensures both ConversationView and ConversationsList components receive the update
          socket.to(`conversation:${data.conversationId}`).emit("conversation:view-update", data);
          
          // Also broadcast to company room so ConversationsList gets updates even when not in specific conversation room
          if (socket.companyId) {
            const targetRoom =
              process.env.NODE_ENV === "development"
                ? "company:dev-company"
                : `company:${socket.companyId}`;
            socket.to(targetRoom).emit("conversation:view-update", data);
          }
        }
      );

      // Handle presence updates
      socket.on("presence:update", (status: "online" | "away" | "offline") => {
        if (socket.companyId) {
          socket.to(`company:${socket.companyId}`).emit("presence:update", {
            userId: socket.userId,
            status,
          });
        }
      });

      socket.on("disconnect", (reason) => {
        console.log(`⚠️ User ${socket.userId} disconnected. Reason: ${reason}, Transport: ${socket.conn?.transport?.name || 'unknown'}`);

        // Log more details for debugging
        if (reason === "ping timeout") {
          console.warn(`⏱️ Ping timeout for user ${socket.userId} - client may be in background tab`);
        } else if (reason === "transport close") {
          console.warn(`🔌 Transport closed for user ${socket.userId} - connection lost`);
        } else if (reason === "transport error") {
          console.error(`❌ Transport error for user ${socket.userId}`);
        }

        // Notify company members of offline status
        if (socket.companyId) {
          socket.to(`company:${socket.companyId}`).emit("presence:update", {
            userId: socket.userId,
            status: "offline",
          });
        }
      });
    });

    return this.io;
  }

  // Emit events to specific rooms
  emitToConversation(conversationId: string, event: string, data: any) {
    if (this.io) {
      console.log(
        `📡 Emitting ${event} to room conversation:${conversationId}`
      );
      this.io.to(`conversation:${conversationId}`).emit(event, data);
    } else if ((global as any).socketIO) {
      console.log(
        `📡 Using global Socket.IO to emit ${event} to conversation:${conversationId}`
      );
      (global as any).socketIO
        .to(`conversation:${conversationId}`)
        .emit(event, data);
    } else {
      console.warn(`⚠️ No Socket.IO instance available to emit ${event}`);
    }
  }

  emitToCompany(companyId: string, event: string, data: any) {
    const targetRoom = `company:${companyId}`;

    if (this.io) {
      console.log(`📡 [SocketService] Emitting ${event} to room ${targetRoom}`, data);
      this.io.to(targetRoom).emit(event, data);
    } else if ((global as any).socketIO) {
      console.log(
        `📡 [SocketService] Using global Socket.IO to emit ${event} to ${targetRoom}`, data
      );
      (global as any).socketIO.to(targetRoom).emit(event, data);
    } else {
      console.warn(`⚠️ [SocketService] No Socket.IO instance available to emit ${event}`);
    }
  }

  emitToUser(userId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  // Get IO instance
  getIO() {
    if (!this.io) {
      throw new Error("Socket.IO not initialized");
    }
    return this.io;
  }
}

export const socketService = new SocketService();
export default socketService;

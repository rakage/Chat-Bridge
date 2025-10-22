const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

// Force production mode
const dev = false;
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3005", 10);

// Set NODE_ENV to production
process.env.NODE_ENV = "production";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url || "", true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  // Initialize Socket.IO with Redis adapter for production horizontal scaling
  try {
    const { Server: SocketIOServer } = require("socket.io");
    const { createAdapter } = require("@socket.io/redis-adapter");
    const { createClient } = require("redis");

    const io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || "http://localhost:3005",
        methods: ["GET", "POST"],
        credentials: true,
      },
      transports: ["websocket", "polling"],
      // Production optimizations
      pingTimeout: 60000,
      pingInterval: 25000,
      connectTimeout: 45000,
    });

    // Setup Redis adapter for multi-server Socket.IO support
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    console.log("🔌 Connecting Socket.IO to Redis adapter for production...");

    const pubClient = createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error("❌ Redis reconnection failed after 10 attempts");
            return new Error("Redis reconnection limit exceeded");
          }
          const delay = Math.min(retries * 100, 3000);
          console.log(
            `🔄 Reconnecting to Redis in ${delay}ms (attempt ${retries})`
          );
          return delay;
        },
      },
    });
    const subClient = pubClient.duplicate();

    // Error handling for Redis clients
    pubClient.on("error", (err) => {
      console.error("❌ Redis Pub Client Error:", err.message);
    });

    subClient.on("error", (err) => {
      console.error("❌ Redis Sub Client Error:", err.message);
    });

    pubClient.on("connect", () => {
      console.log("✅ Redis Pub Client connected");
    });

    subClient.on("connect", () => {
      console.log("✅ Redis Sub Client connected");
    });

    pubClient.on("reconnecting", () => {
      console.log("🔄 Redis Pub Client reconnecting...");
    });

    subClient.on("reconnecting", () => {
      console.log("🔄 Redis Sub Client reconnecting...");
    });

    // Connect Redis clients and setup adapter
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log(
          "✅ Socket.IO Redis adapter initialized - Production ready for horizontal scaling!"
        );
        console.log(
          "📊 Multiple server instances can now share Socket.IO connections"
        );
      })
      .catch((err) => {
        console.error(
          "❌ Failed to connect Redis for Socket.IO adapter:",
          err.message
        );
        console.warn(
          "⚠️  Socket.IO will run in single-server mode without Redis adapter"
        );
        console.warn(
          "⚠️  Horizontal scaling will NOT work without Redis adapter"
        );
      });

    // Enhanced connection handling with company and conversation rooms
    io.on("connection", (socket) => {
      console.log("👤 User connected:", socket.id);

      // Handle company room joining
      socket.on("join:company", (companyId) => {
        if (companyId) {
          socket.join(`company:${companyId}`);
          console.log(`✅ User ${socket.id} joined company:${companyId} room`);
          socket.emit("joined:company", { companyId });
        }
      });

      // Handle conversation room joining
      socket.on("join:conversation", (conversationId) => {
        socket.join(`conversation:${conversationId}`);
        console.log(
          `✅ User ${socket.id} joined conversation:${conversationId}`
        );
        socket.emit("joined:conversation", { conversationId });
      });

      socket.on("leave:conversation", (conversationId) => {
        socket.leave(`conversation:${conversationId}`);
        socket.emit("left:conversation", { conversationId });
      });

      // Handle widget customer online status
      socket.on("widget:online", (data) => {
        const { conversationId, sessionId } = data;
        socket.data.widgetSession = sessionId;
        socket.data.widgetConversationId = conversationId;
        socket.to(`conversation:${conversationId}`).emit("customer:online", {
          conversationId,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on("widget:offline", (data) => {
        const { conversationId, sessionId } = data;
        socket.to(`conversation:${conversationId}`).emit("customer:offline", {
          conversationId,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on("widget:heartbeat", (data) => {
        const { conversationId, sessionId } = data;
        socket.data.lastHeartbeat = Date.now();
        socket.to(`conversation:${conversationId}`).emit("customer:heartbeat", {
          conversationId,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle conversation view updates
      socket.on("conversation:view-update", (data) => {
        socket
          .to(`conversation:${data.conversationId}`)
          .emit("conversation:view-update", data);

        if (data.companyId) {
          socket
            .to(`company:${data.companyId}`)
            .emit("conversation:view-update", data);
        }
      });

      // Handle conversation read events
      socket.on("conversation:read", (data) => {
        if (data.companyId) {
          socket.to(`company:${data.companyId}`).emit("conversation:read", {
            conversationId: data.conversationId,
            timestamp: data.timestamp,
          });
        }
      });

      socket.on("disconnect", () => {
        console.log("👤 User disconnected:", socket.id);

        // Widget customer offline broadcast
        if (socket.data.widgetConversationId && socket.data.widgetSession) {
          socket
            .to(`conversation:${socket.data.widgetConversationId}`)
            .emit("customer:offline", {
              conversationId: socket.data.widgetConversationId,
              sessionId: socket.data.widgetSession,
              timestamp: new Date().toISOString(),
            });
        }
      });
    });

    // Store io instance globally for access from API routes
    global.socketIO = io;
    console.log("✅ Socket.IO initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize Socket.IO:", error.message);
  }

  // Initialize BullMQ workers using API route
  try {
    console.log("🔄 Initializing BullMQ workers via API...");
    // We'll call the initialization API after server starts
    setTimeout(async () => {
      try {
        const response = await fetch(
          "http://localhost:3005/api/realtime/init",
          {
            method: "POST",
          }
        );
        if (response.ok) {
          console.log("✅ BullMQ workers initialized via API");
        } else {
          console.error(
            "❌ Failed to initialize workers via API:",
            response.status
          );
        }
      } catch (fetchError) {
        console.error(
          "❌ Failed to call worker initialization API:",
          fetchError.message
        );
      }
    }, 2000); // Wait 2 seconds for server to be ready
  } catch (error) {
    console.error("❌ Failed to setup worker initialization:", error.message);
  }

  server
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Production server ready on http://${hostname}:${port}`);
      console.log("📡 Real-time features enabled");
      console.log("⚡ Using pre-built optimized pages");
    });
});

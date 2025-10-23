const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const dev = true; // Always use production mode for real-time server
const hostname = "localhost";
const port = parseInt(process.env.PORT || "3005", 10);

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

  // Initialize Socket.IO with Redis adapter for horizontal scaling
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

    // Setup Redis adapter for multi-server Socket.IO support
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
    console.log("🔌 Connecting Socket.IO to Redis adapter...");

    const pubClient = createClient({ url: redisUrl });
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

    // Connect Redis clients and setup adapter
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log(
          "✅ Socket.IO Redis adapter initialized - Ready for horizontal scaling!"
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
      });

    // Enhanced connection handling for proper room management
    io.on("connection", (socket) => {
      console.log("👤 User connected:", socket.id);

      // Handle company room joining based on user's company ID
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
        console.log(
          `🟢 Widget customer online: ${conversationId} (${sessionId})`
        );

        // Store widget session in memory
        socket.data.widgetSession = sessionId;
        socket.data.widgetConversationId = conversationId;

        // Broadcast online status to conversation room
        socket.to(`conversation:${conversationId}`).emit("customer:online", {
          conversationId,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on("widget:offline", (data) => {
        const { conversationId, sessionId } = data;
        console.log(
          `🔴 Widget customer offline: ${conversationId} (${sessionId})`
        );

        // Broadcast offline status to conversation room
        socket.to(`conversation:${conversationId}`).emit("customer:offline", {
          conversationId,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on("widget:heartbeat", (data) => {
        const { conversationId, sessionId } = data;
        console.log(`💓 Widget heartbeat: ${conversationId} (${sessionId})`);

        // Update last seen timestamp
        socket.data.lastHeartbeat = Date.now();

        // Broadcast heartbeat to conversation room (agents can use this)
        socket.to(`conversation:${conversationId}`).emit("customer:heartbeat", {
          conversationId,
          sessionId,
          timestamp: new Date().toISOString(),
        });
      });

      // Handle conversation view updates (real-time communication between ConversationView and ConversationsList)
      socket.on("conversation:view-update", (data) => {
        console.log(
          `📡 User ${socket.id} emitted conversation:view-update (${data.type}) for conversation ${data.conversationId}`
        );

        // Broadcast to all clients in the conversation room
        socket
          .to(`conversation:${data.conversationId}`)
          .emit("conversation:view-update", data);

        // Also broadcast to user's company room so ConversationsList gets updates even when not in specific conversation room
        if (data.companyId) {
          socket
            .to(`company:${data.companyId}`)
            .emit("conversation:view-update", data);
        }
      });

      // Handle conversation read events
      socket.on("conversation:read", (data) => {
        console.log(
          `📖 User ${socket.id} marked conversation ${data.conversationId} as read`
        );

        // Broadcast to all clients in the user's company room (except sender)
        if (data.companyId) {
          socket.to(`company:${data.companyId}`).emit("conversation:read", {
            conversationId: data.conversationId,
            timestamp: data.timestamp,
          });
        }
      });

      socket.on("disconnect", () => {
        console.log("👤 User disconnected:", socket.id);

        // If this was a widget customer, broadcast offline status
        if (socket.data.widgetConversationId && socket.data.widgetSession) {
          console.log(
            `🔴 Widget customer disconnected: ${socket.data.widgetConversationId}`
          );
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
    console.log("✅ Socket.IO initialized with enhanced room management");
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
      console.log(`> Ready on http://${hostname}:${port}`);
      console.log("📡 Server running with real-time support");
    });
});

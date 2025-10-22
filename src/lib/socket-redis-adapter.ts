/**
 * Socket.IO Redis Adapter Helper
 * 
 * Provides utilities for setting up Socket.IO with Redis adapter
 * for horizontal scaling across multiple server instances.
 */

import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient, RedisClientType } from "redis";

interface RedisAdapterOptions {
  redisUrl?: string;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  onConnect?: () => void;
  onError?: (error: Error) => void;
}

interface RedisAdapterResult {
  pubClient: RedisClientType;
  subClient: RedisClientType;
  cleanup: () => Promise<void>;
}

/**
 * Setup Redis adapter for Socket.IO server
 * Enables horizontal scaling by sharing Socket.IO state across multiple instances
 */
export async function setupSocketIORedisAdapter(
  io: SocketIOServer,
  options: RedisAdapterOptions = {}
): Promise<RedisAdapterResult> {
  const {
    redisUrl = process.env.REDIS_URL || "redis://localhost:6379",
    maxReconnectAttempts = 10,
    reconnectDelay = 100,
    onConnect,
    onError,
  } = options;

  console.log("🔌 Setting up Socket.IO Redis adapter...");

  // Create Redis clients
  const pubClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > maxReconnectAttempts) {
          console.error(
            `❌ Redis reconnection failed after ${maxReconnectAttempts} attempts`
          );
          return new Error("Redis reconnection limit exceeded");
        }
        const delay = Math.min(retries * reconnectDelay, 3000);
        console.log(
          `🔄 Reconnecting to Redis in ${delay}ms (attempt ${retries}/${maxReconnectAttempts})`
        );
        return delay;
      },
    },
  });

  const subClient = pubClient.duplicate();

  // Setup event handlers for pub client
  pubClient.on("error", (err) => {
    console.error("❌ Redis Pub Client Error:", err.message);
    if (onError) onError(err);
  });

  pubClient.on("connect", () => {
    console.log("✅ Redis Pub Client connected");
  });

  pubClient.on("ready", () => {
    console.log("✅ Redis Pub Client ready");
    if (onConnect) onConnect();
  });

  pubClient.on("reconnecting", () => {
    console.log("🔄 Redis Pub Client reconnecting...");
  });

  pubClient.on("end", () => {
    console.log("🔴 Redis Pub Client connection closed");
  });

  // Setup event handlers for sub client
  subClient.on("error", (err) => {
    console.error("❌ Redis Sub Client Error:", err.message);
    if (onError) onError(err);
  });

  subClient.on("connect", () => {
    console.log("✅ Redis Sub Client connected");
  });

  subClient.on("ready", () => {
    console.log("✅ Redis Sub Client ready");
  });

  subClient.on("reconnecting", () => {
    console.log("🔄 Redis Sub Client reconnecting...");
  });

  subClient.on("end", () => {
    console.log("🔴 Redis Sub Client connection closed");
  });

  try {
    // Connect both clients
    await Promise.all([pubClient.connect(), subClient.connect()]);

    // Setup Socket.IO adapter
    io.adapter(createAdapter(pubClient, subClient));

    console.log(
      "✅ Socket.IO Redis adapter initialized successfully!"
    );
    console.log("📊 Socket.IO is now ready for horizontal scaling");
    console.log("💡 Multiple server instances will share Socket.IO connections and rooms");

    // Return cleanup function
    const cleanup = async () => {
      console.log("🧹 Cleaning up Redis connections...");
      await Promise.all([
        pubClient.quit().catch(console.error),
        subClient.quit().catch(console.error),
      ]);
      console.log("✅ Redis connections closed");
    };

    return {
      pubClient: pubClient as RedisClientType,
      subClient: subClient as RedisClientType,
      cleanup,
    };
  } catch (error) {
    console.error("❌ Failed to setup Socket.IO Redis adapter:", error);
    throw error;
  }
}

/**
 * Get statistics about Redis adapter
 */
export async function getRedisAdapterStats(
  pubClient: RedisClientType
): Promise<{
  connectedClients: number;
  memoryUsage: string;
  uptime: number;
}> {
  try {
    const info = await pubClient.info("server");
    const stats = await pubClient.info("stats");

    // Parse info strings
    const uptimeMatch = info.match(/uptime_in_seconds:(\d+)/);
    const clientsMatch = stats.match(/connected_clients:(\d+)/);
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);

    return {
      connectedClients: clientsMatch ? parseInt(clientsMatch[1]) : 0,
      memoryUsage: memoryMatch ? memoryMatch[1] : "Unknown",
      uptime: uptimeMatch ? parseInt(uptimeMatch[1]) : 0,
    };
  } catch (error) {
    console.error("Failed to get Redis stats:", error);
    throw error;
  }
}

/**
 * Health check for Redis adapter
 */
export async function checkRedisAdapterHealth(
  pubClient: RedisClientType,
  subClient: RedisClientType
): Promise<{
  healthy: boolean;
  pubClientStatus: string;
  subClientStatus: string;
}> {
  try {
    const pubPing = await pubClient.ping();
    const subPing = await subClient.ping();

    return {
      healthy: pubPing === "PONG" && subPing === "PONG",
      pubClientStatus: pubClient.isReady ? "ready" : "not ready",
      subClientStatus: subClient.isReady ? "ready" : "not ready",
    };
  } catch (error) {
    console.error("Redis health check failed:", error);
    return {
      healthy: false,
      pubClientStatus: "error",
      subClientStatus: "error",
    };
  }
}

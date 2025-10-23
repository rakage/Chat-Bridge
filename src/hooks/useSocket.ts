"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { io, Socket } from "socket.io-client";

interface UseSocketOptions {
  autoConnect?: boolean;
}

export function useSocket(options: UseSocketOptions = { autoConnect: true }) {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || !options.autoConnect) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Create socket connection
    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin,
      {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: Infinity,
        timeout: 20000,
        autoConnect: true,
      }
    );

    newSocket.on("connect", () => {
      console.log("✅ Connected to Socket.IO server");
      setIsConnected(true);
      setError(null);

      // Join company room automatically upon connection if user has companyId
      if (session?.user?.companyId) {
        console.log("🏢 Emitting join:company with companyId:", session.user.companyId);
        newSocket.emit("join:company", session.user.companyId);
      } else {
        console.warn("⚠️ No companyId found in session, cannot join company room");
      }
    });

    newSocket.on("joined:company", (data) => {
      console.log("✅ Successfully joined company room:", data);
    });

    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber}`);
    });

    newSocket.on("reconnect", (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts`);
      setIsConnected(true);
      setError(null);

      // Rejoin company room after reconnection
      if (session?.user?.companyId) {
        console.log("🏢 Rejoining company room after reconnection");
        newSocket.emit("join:company", session.user.companyId);
      }
    });

    newSocket.on("reconnect_failed", () => {
      console.error("❌ Reconnection failed");
      setError("Failed to reconnect to server");
    });

    newSocket.on("disconnect", (reason) => {
      console.log("⚠️ Disconnected from Socket.IO server. Reason:", reason);
      setIsConnected(false);
      
      // Auto-reconnect unless it's a manual disconnect
      if (reason === "io server disconnect") {
        // Server initiated the disconnect, manually reconnect
        newSocket.connect();
      }
    });

    newSocket.on("connect_error", (error) => {
      console.error("❌ Socket connection error:", error);
      setError(error.message);
      setIsConnected(false);
    });

    newSocket.on("error", (error) => {
      console.error("❌ Socket error:", error);
      setError(error.message);
    });

    setSocket(newSocket);

    // Handle browser visibility to prevent unnecessary disconnections
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("📱 Tab hidden - keeping connection alive");
        // Don't disconnect, just log the visibility change
      } else {
        console.log("📱 Tab visible - connection active");
        // Ensure socket is still connected
        if (!newSocket.connected) {
          console.log("🔄 Reconnecting socket after tab became visible");
          newSocket.connect();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      console.log("🧹 Cleaning up socket hook");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      // Only disconnect if we're actually unmounting (not just tab switching)
      // The socket will auto-reconnect if needed due to reconnection settings
      newSocket.disconnect();
    };
  }, [session, status, options.autoConnect]);

  const joinConversation = (conversationId: string) => {
    if (socket) {
      socket.emit("join:conversation", conversationId);
    }
  };

  const leaveConversation = (conversationId: string) => {
    if (socket) {
      socket.emit("leave:conversation", conversationId);
    }
  };

  const sendTyping = (conversationId: string, isTyping: boolean) => {
    if (socket) {
      socket.emit(isTyping ? "typing:start" : "typing:stop", {
        conversationId,
      });
    }
  };

  const updatePresence = (status: "online" | "away" | "offline") => {
    if (socket) {
      socket.emit("presence:update", status);
    }
  };

  return {
    socket,
    isConnected,
    error,
    joinConversation,
    leaveConversation,
    sendTyping,
    updatePresence,
  };
}

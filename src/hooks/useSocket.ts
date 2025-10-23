"use client";

import { useEffect, useState, useRef } from "react";
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
  const disconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Create socket connection with aggressive settings to survive tab switching
    const newSocket = io(
      process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin,
      {
        transports: ["websocket"], // Use WebSocket only for more stable connection
        upgrade: false, // Don't upgrade transport
        reconnection: true,
        reconnectionDelay: 500,
        reconnectionDelayMax: 2000,
        reconnectionAttempts: Infinity,
        timeout: 30000,
        autoConnect: true,
        // Match server-side timeouts
        path: "/socket.io/",
        closeOnBeforeunload: false, // Don't close on page unload
      }
    );

    newSocket.on("connect", () => {
      console.log("✅ Connected to Socket.IO server");
      
      // Clear any pending disconnect timeout
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      
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
      
      // Use grace period before showing as disconnected
      // This prevents flickering "Offline" status during tab switches
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
      }
      
      disconnectTimeoutRef.current = setTimeout(() => {
        // Only set disconnected if still not connected after grace period
        if (!newSocket.connected) {
          console.log("❌ Still disconnected after grace period");
          setIsConnected(false);
        }
      }, 3000); // 3 second grace period
      
      // Auto-reconnect unless it's a manual disconnect
      if (reason === "io server disconnect") {
        // Server initiated the disconnect, manually reconnect
        console.log("🔄 Server disconnected us, reconnecting...");
        newSocket.connect();
      } else if (reason === "ping timeout") {
        // Ping timeout (browser throttling), reconnect immediately
        console.log("🔄 Ping timeout (tab throttling), reconnecting...");
        newSocket.connect();
      } else if (reason === "transport close") {
        // Transport closed, will auto-reconnect
        console.log("🔄 Transport closed, auto-reconnect will handle it");
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
      
      // Clear any pending disconnect timeout
      if (disconnectTimeoutRef.current) {
        clearTimeout(disconnectTimeoutRef.current);
        disconnectTimeoutRef.current = null;
      }
      
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

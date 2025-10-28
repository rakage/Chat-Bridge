"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FacebookIcon } from "@/components/ui/facebook-icon";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { TelegramIcon } from "@/components/ui/telegram-icon";
import { WidgetIcon } from "@/components/ui/widget-icon";
import { MessageSquare, Search, User, Bot, Circle, RefreshCw, Loader2 } from "lucide-react";

interface ConversationSummary {
  id: string;
  psid: string;
  platform: "FACEBOOK" | "INSTAGRAM" | "TELEGRAM" | "WIDGET";
  status: "OPEN" | "SNOOZED" | "CLOSED";
  autoBot: boolean;
  customerName?: string;
  customerProfile?: {
    firstName: string;
    lastName: string;
    fullName: string;
    profilePicture?: string;
    instagramUrl?: string;
  } | null;
  lastMessageAt: string;
  messageCount: number;
  unreadCount: number;
  pageName?: string;
  lastMessage?: {
    text: string;
    role: "USER" | "AGENT" | "BOT";
  };
  isTyping?: boolean;
}

interface ConversationsListProps {
  onSelectConversation: (conversationId: string) => void;
  selectedConversationId?: string;
}

export default function ConversationsList({
  onSelectConversation,
  selectedConversationId,
}: ConversationsListProps) {
  const { data: session } = useSession();
  const { socket, isConnected } = useSocket();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "UNREAD">("ALL");
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [newMessageNotification, setNewMessageNotification] = useState<string | null>(null);
  const [newlyUnreadConversations, setNewlyUnreadConversations] = useState<Set<string>>(new Set());
  const [hasNewUnreadMessages, setHasNewUnreadMessages] = useState(false);
  const [lastSeenMap, setLastSeenMap] = useState<Map<string, Date>>(new Map());
  const [profilePhotoErrors, setProfilePhotoErrors] = useState<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load user's last seen timestamps - runs once when user session is available
  useEffect(() => {
    if (session?.user?.id) {
      loadLastSeenData();
    }
  }, [session?.user?.id]);


  const loadLastSeenData = async () => {
    try {
      if (!session?.user?.id) return;
      
      console.log("📊 Loading last seen timestamps for user:", session.user.id);
      const response = await fetch("/api/last-seen");
      
      if (!response.ok) {
        console.error("Failed to fetch last seen data:", response.statusText);
        return;
      }
      
      const data = await response.json();
      const lastSeenMap = new Map<string, Date>();
      
      // Convert the object back to Map with Date objects
      Object.entries(data.lastSeen).forEach(([conversationId, timestamp]) => {
        lastSeenMap.set(conversationId, new Date(timestamp as string));
      });
      
      setLastSeenMap(lastSeenMap);
      
      console.log("✅ Loaded last seen data:", {
        count: lastSeenMap.size,
        entries: Array.from(lastSeenMap.entries()).map(([id, date]) => ({
          conversationId: id,
          lastSeenAt: date.toISOString()
        }))
      });
    } catch (error) {
      console.error("❌ Failed to load last seen data:", error);
    }
  };

  // Manual refresh function 
  const manualRefresh = async () => {
    console.log("🔄 Manual refresh requested");
    
    // Reset pagination state
    setOffset(0);
    setHasMore(true);
    
    // Refresh both conversations and last_seen data
    if (session?.user?.id) {
      await loadLastSeenData();
    }
    await fetchConversations(false, false);
    
    console.log("✅ Manual refresh completed");
  };

  // Infinite scroll handler
  const handleScroll = () => {
    if (!scrollContainerRef.current || loadingMore || !hasMore) return;
    
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // Load more when scrolled 80% down
    if (scrollPercentage > 0.8) {
      console.log("📜 Loading more conversations...");
      fetchConversations(false, true);
    }
  };

  // Recompute unread state whenever lastSeenMap changes to avoid stale UI when navigating back
  useEffect(() => {
    if (conversations.length === 0) return;

    console.log("🔄 Recomputing unread state based on lastSeenMap", {
      conversationCount: conversations.length,
      lastSeenMapSize: lastSeenMap.size,
      lastSeenEntries: Array.from(lastSeenMap.entries()).map(([id, date]) => ({
        conversationId: id,
        lastSeenAt: date.toISOString()
      }))
    });

    const updatedNewlyUnread = new Set<string>();
    let updatedTotalUnread = 0;
    let changed = false;

    const updatedConversations = conversations.map((conv) => {
      const lastMessageTime = new Date(conv.lastMessageAt);
      const lastSeenTime = lastSeenMap.get(conv.id);
      
      // Only show as unread if last message is from customer (USER role)
      const isLastMessageFromCustomer = conv.lastMessage?.role === 'USER';
      const isUnread = isLastMessageFromCustomer && (!lastSeenTime || lastMessageTime > lastSeenTime);

      console.log(`🔍 Frontend unread check for ${conv.id}:`, {
        lastMessageAt: conv.lastMessageAt,
        lastMessageRole: conv.lastMessage?.role,
        lastSeenTime: lastSeenTime?.toISOString() || 'never',
        currentUnreadCount: conv.unreadCount,
        isLastMessageFromCustomer,
        calculatedIsUnread: isUnread,
        serverSaysUnread: conv.unreadCount > 0
      });

      if (isUnread) {
        updatedNewlyUnread.add(conv.id);
        updatedTotalUnread += conv.unreadCount;
        return conv;
      } else {
        // If server still says unread but lastSeen shows it's read, or last message is from agent/bot, fix locally
        if (conv.unreadCount !== 0) {
          console.log(`✅ Fixing conversation ${conv.id}: ${!isLastMessageFromCustomer ? 'last message from agent/bot' : 'lastSeen shows it\'s read'}`);
          changed = true;
        }
        return conv.unreadCount === 0 ? conv : { ...conv, unreadCount: 0 };
      }
    });

    console.log("📊 Unread state recomputation result:", {
      changed,
      newlyUnreadCount: updatedNewlyUnread.size,
      conversationsToFix: updatedConversations.filter(c => conversations.find(orig => orig.id === c.id && orig.unreadCount !== c.unreadCount))
    });

    // Only update conversations if something changed to avoid unnecessary renders
    if (changed) {
      setConversations(updatedConversations);
    }

    setNewlyUnreadConversations(updatedNewlyUnread);
    setHasNewUnreadMessages(updatedNewlyUnread.size > 0);

    // Recompute total unread count from updated conversations
    if (changed) {
      updatedTotalUnread = updatedConversations.reduce((sum, c) => sum + c.unreadCount, 0);
    } else {
      updatedTotalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);
    }
    setTotalUnreadCount(updatedTotalUnread);

  }, [lastSeenMap, conversations]);

  // Initial data load - replaced polling with socket-based real-time updates
  useEffect(() => {
    if (!initializedRef.current) {
      // Initial fetch - only once when component mounts
      fetchConversations();
      initializedRef.current = true;
      console.log("✅ Initial conversations loaded, real-time updates handled via socket");
    }
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(permission => {
        console.log("🔔 Notification permission:", permission);
      });
    }
  }, []);
  
  // Update page title with unread count
  useEffect(() => {
    if (totalUnreadCount > 0) {
      document.title = `(${totalUnreadCount}) Social Bot Dashboard`;
    } else {
      document.title = "Social Bot Dashboard";
    }
    
    return () => {
      document.title = "Social Bot Dashboard";
    };
  }, [totalUnreadCount]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !isConnected) return;

    console.log("🔌 ConversationsList: Setting up socket event listeners");

    // Listen for conversation read events from other clients or server
    const handleConversationRead = (data: {
      conversationId: string;
      userId: string;
      timestamp: string;
    }) => {
      console.log(`📖 Received conversation:read event for ${data.conversationId} by user ${data.userId}`);
      
      // Update local conversation state to mark as read
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === data.conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );

      // Update last seen map if it was the current user
      if (session?.user?.id === data.userId) {
        const readTime = new Date(data.timestamp);
        setLastSeenMap(prev => {
          const updated = new Map(prev);
          updated.set(data.conversationId, readTime);
          return updated;
        });

        // Remove from newly unread conversations
        setNewlyUnreadConversations(prev => {
          const updated = new Set(prev);
          updated.delete(data.conversationId);
          return updated;
        });

        // Update total unread count
        setConversations(currentConversations => {
          const newTotalUnread = currentConversations.reduce(
            (sum, conv) => sum + (conv.id === data.conversationId ? 0 : conv.unreadCount),
            0
          );
          setTotalUnreadCount(newTotalUnread);
          return currentConversations;
        });
      }
    };

    // Listen for conversation view updates (new messages, bot status changes, etc.)
    const handleConversationViewUpdate = (data: {
      conversationId: string;
      type: "new_message" | "message_sent" | "bot_status_changed" | "typing_start" | "typing_stop" | "new_conversation";
      message?: { text: string; role: "USER" | "AGENT" | "BOT"; createdAt: string };
      lastMessageAt?: string;
      autoBot?: boolean;
      timestamp: string;
      conversation?: ConversationSummary; // For new_conversation type
    }) => {
      console.log(`📡 [ConversationsList] Received conversation:view-update (${data.type}) for conversation ${data.conversationId}`, data);

      setConversations((prev) => {
        console.log(`📡 [ConversationsList] Current conversations count: ${prev.length}`);
        
        // Handle new conversation - add it to the list
        if (data.type === "new_conversation" && data.conversation) {
          console.log(`📡 [ConversationsList] Adding new conversation to list:`, data.conversation);
          const exists = prev.find(conv => conv.id === data.conversationId);
          if (!exists) {
            return [data.conversation, ...prev].sort((a, b) =>
              new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
            );
          } else {
            console.log(`📡 [ConversationsList] Conversation already exists, skipping add`);
          }
        }
        
        return prev.map((conv) => {
          if (conv.id === data.conversationId) {
            console.log(`📡 [ConversationsList] Found matching conversation, updating...`);
            const updates: Partial<ConversationSummary> = {};

            switch (data.type) {
              case "new_message":
                if (data.message && data.lastMessageAt) {
                  updates.lastMessage = data.message;
                  updates.lastMessageAt = data.lastMessageAt;
                  updates.messageCount = conv.messageCount + 1;

                  // Only increment unread count if message is from USER (customer), not from AGENT or BOT
                  if (data.message.role === "USER") {
                    updates.unreadCount = conv.unreadCount + 1;
                  }
                  console.log(`📡 [ConversationsList] Applied new_message updates:`, updates);
                }
                break;

              case "message_sent":
                if (data.message && data.lastMessageAt) {
                  updates.lastMessage = data.message;
                  updates.lastMessageAt = data.lastMessageAt;
                  updates.messageCount = conv.messageCount + 1;
                  console.log(`📡 [ConversationsList] Applied message_sent updates:`, updates);
                }
                break;

              case "bot_status_changed":
                if (data.autoBot !== undefined) {
                  updates.autoBot = data.autoBot;
                  console.log(`📡 [ConversationsList] Applied bot_status_changed updates:`, updates);
                }
                break;

              case "typing_start":
                updates.isTyping = true;
                console.log(`📡 [ConversationsList] Applied typing_start updates:`, updates);
                break;

              case "typing_stop":
                updates.isTyping = false;
                console.log(`📡 [ConversationsList] Applied typing_stop updates:`, updates);
                break;
            }

            return { ...conv, ...updates };
          }
          return conv;
        }).sort((a, b) =>
          new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
      });
    };

    // Handle new conversation event
    const handleConversationNew = (data: { conversation: any }) => {
      console.log("🆕 [ConversationsList] Received conversation:new event:", data);
      
      const newConversation = data.conversation;
      
      setConversations((prev) => {
        // Check if conversation already exists
        const exists = prev.some((conv) => conv.id === newConversation.id);
        if (exists) {
          console.log(`⚠️ [ConversationsList] Conversation ${newConversation.id} already exists, skipping`);
          return prev;
        }
        
        console.log(`✅ [ConversationsList] Adding new conversation ${newConversation.id} to list`);
        
        // Add new conversation at the top
        const updated = [newConversation, ...prev].sort(
          (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
        );
        
        return updated;
      });
    };

    socket.on("conversation:new", handleConversationNew);
    socket.on("conversation:read", handleConversationRead);
    socket.on("conversation:view-update", handleConversationViewUpdate);

    return () => {
      console.log("🔌 ConversationsList: Cleaning up socket event listeners");
      socket.off("conversation:new", handleConversationNew);
      socket.off("conversation:read", handleConversationRead);
      socket.off("conversation:view-update", handleConversationViewUpdate);
    };
  }, [socket, isConnected, session?.user?.id]);

  // Socket connection status display
  useEffect(() => {
    console.log("🔌 ConversationsList: Socket connection status:", {
      isConnected,
      socketExists: !!socket,
      socketId: socket?.id,
    });
  }, [socket, isConnected]);


  const fetchConversations = async (silent = false, loadMore = false) => {
    try {
      if (!silent) {
        if (loadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
        }
      }
      
      const currentOffset = loadMore ? offset : 0;
      const limit = 10; // Load 10 conversations at a time
      const response = await fetch(`/api/conversations?limit=${limit}&offset=${currentOffset}`);

      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }

      const data = await response.json();
      const newConversations = (data.conversations || []).sort(
        (a: ConversationSummary, b: ConversationSummary) =>
          new Date(b.lastMessageAt).getTime() -
          new Date(a.lastMessageAt).getTime()
      );
      
      // Update hasMore based on API response
      setHasMore(data.hasMore || false);
      
      // Update offset for next load
      if (loadMore) {
        setOffset(currentOffset + limit);
      } else {
        setOffset(limit);
      }
      
      // Check for changes if this is a polling update
      if (silent) {
        setConversations(prevConversations => {
          // Calculate previous and new unread counts
          const prevTotalUnread = prevConversations.reduce((sum: number, conv: ConversationSummary) => sum + conv.unreadCount, 0);
          const newTotalUnread = newConversations.reduce((sum: number, conv: ConversationSummary) => sum + conv.unreadCount, 0);
          
          // Simple comparison to detect changes
          const hasChanges = JSON.stringify(prevConversations) !== JSON.stringify(newConversations);
          
          if (hasChanges) {
            console.log("✨ Detected conversation changes, updating list");
            console.log("Previous conversations:", prevConversations.map(c => ({id: c.id, unread: c.unreadCount})));
            console.log("New conversations:", newConversations.map((c: ConversationSummary) => ({id: c.id, unread: c.unreadCount})));
            console.log("Previous total unread:", prevTotalUnread, "New total unread:", newTotalUnread);
            setLastUpdateTime(new Date());
            
            // Find conversations with new messages based on last_seen timestamps
            const newlyUnread = new Set<string>();
            let newMessagesCount = 0;
            
            newConversations.forEach((conv: ConversationSummary) => {
              const lastMessageTime = new Date(conv.lastMessageAt);
              const lastSeenTime = lastSeenMap.get(conv.id);
              
              // If we don't have a last_seen record or the last message is after last_seen
              if (!lastSeenTime || lastMessageTime > lastSeenTime) {
                newlyUnread.add(conv.id);
                const prevConv = prevConversations.find((p: ConversationSummary) => p.id === conv.id);
                
                // Only count as new if this is a polling update with actual changes
                if (prevConv && new Date(prevConv.lastMessageAt) < lastMessageTime) {
                  newMessagesCount++;
                  console.log(`🔴 New message detected for ${conv.id}: last seen ${lastSeenTime?.toISOString() || 'never'}, message at ${lastMessageTime.toISOString()}`);
                }
              }
            });
            
            setNewlyUnreadConversations(newlyUnread);
            setHasNewUnreadMessages(newlyUnread.size > 0);
            
            // Show notification for genuinely new messages
            if (newMessagesCount > 0) {
              const message = newMessagesCount === 1 ? "1 new message" : `${newMessagesCount} new messages`;
              setNewMessageNotification(message);
              
              // Clear notification after 5 seconds
              setTimeout(() => {
                setNewMessageNotification(null);
              }, 5000);
              
              // Browser notification if supported and permission granted
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Social Bot Dashboard", {
                  body: `You have ${message}`,
                  icon: "/favicon.ico",
                  tag: "new-message"
                });
              }
            }
            
            setTotalUnreadCount(newTotalUnread);
            return newConversations;
          } else {
            console.log("💬 No changes detected");
            return prevConversations;
          }
        });
      } else {
        // Initial load or load more - determine newly unread conversations
        const initiallyUnread = new Set<string>();
        newConversations.forEach((conv: ConversationSummary) => {
          const lastMessageTime = new Date(conv.lastMessageAt);
          const lastSeenTime = lastSeenMap.get(conv.id);
          
          if (!lastSeenTime || lastMessageTime > lastSeenTime) {
            initiallyUnread.add(conv.id);
          }
        });
        
        setNewlyUnreadConversations(prev => {
          const updated = new Set(prev);
          initiallyUnread.forEach(id => updated.add(id));
          return updated;
        });
        setHasNewUnreadMessages(initiallyUnread.size > 0);
        
        // Append or replace conversations based on loadMore flag
        setConversations(prev => {
          if (loadMore) {
            // Append new conversations, avoiding duplicates
            const existingIds = new Set(prev.map(c => c.id));
            const uniqueNew = newConversations.filter((c: ConversationSummary) => !existingIds.has(c.id));
            return [...prev, ...uniqueNew];
          } else {
            // Replace all conversations (initial load or refresh)
            return newConversations;
          }
        });
        
        setLastUpdateTime(new Date());
        
        // Recalculate total unread count
        const newTotalUnread = loadMore 
          ? totalUnreadCount + newConversations.reduce((sum: number, conv: ConversationSummary) => sum + conv.unreadCount, 0)
          : newConversations.reduce((sum: number, conv: ConversationSummary) => sum + conv.unreadCount, 0);
        setTotalUnreadCount(newTotalUnread);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      // Don't show loading error for silent updates
      if (!silent) {
        // Could show error message to user here
      }
    } finally {
      if (!silent) {
        if (loadMore) {
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    }
  };

  // Handle profile photo loading errors
  const handleProfilePhotoError = (conversationId: string) => {
    setProfilePhotoErrors((prev) => {
      const updated = new Set(prev);
      updated.add(conversationId);
      return updated;
    });
    console.log(`📸 Profile photo failed to load for conversation ${conversationId}`);
  };

  // Helper function to determine if a conversation is truly unread
  const isConversationUnread = (conversation: ConversationSummary) => {
    const lastMessageTime = new Date(conversation.lastMessageAt);
    const lastSeenTime = lastSeenMap.get(conversation.id);
    
    // Only show as unread if last message is from customer (USER role)
    const isLastMessageFromCustomer = conversation.lastMessage?.role === 'USER';
    
    if (!isLastMessageFromCustomer) {
      // Last message from agent or bot - not unread
      return false;
    }
    
    // Use getTime() for more reliable comparison
    const messageTimestamp = lastMessageTime.getTime();
    const seenTimestamp = lastSeenTime ? lastSeenTime.getTime() : 0;
    
    const noLastSeen = !lastSeenTime;
    const messageAfterSeen = messageTimestamp > seenTimestamp;
    const serverUnread = conversation.unreadCount > 0;
    
    // Prioritize timestamp-based logic: if we have lastSeen data, use it
    // Only fall back to server unread count if we don't have timestamp data
    let isUnread;
    if (lastSeenTime) {
      // We have timestamp data - use it (ignore server unread count)
      isUnread = messageAfterSeen;
    } else {
      // No timestamp data - fall back to server unread count
      isUnread = serverUnread;
    }
    
    // Debug logging for troubleshooting
    console.log(`🔍 Unread check for ${conversation.id}:`, {
      lastMessageAt: conversation.lastMessageAt,
      lastMessageRole: conversation.lastMessage?.role,
      isLastMessageFromCustomer,
      lastMessageTime: lastMessageTime.toISOString(),
      lastSeenTime: lastSeenTime?.toISOString() || 'never',
      messageTimestamp,
      seenTimestamp,
      noLastSeen,
      messageAfterSeen,
      serverUnread,
      timeDiffMs: messageTimestamp - seenTimestamp,
      usingTimestampLogic: !!lastSeenTime,
      finalResult: isUnread
    });
    
    return isUnread;
  };

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch =
      conv.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.psid.includes(searchTerm);

    let matchesFilter = true;
    if (filter === "OPEN") {
      matchesFilter = conv.status === "OPEN";
    } else if (filter === "UNREAD") {
      // Use our last_seen based logic to determine unread status
      matchesFilter = isConversationUnread(conv);
    }

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-800";
      case "SNOOZED":
        return "bg-yellow-100 text-yellow-800";
      case "CLOSED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else {
      return `${diffDays}d`;
    }
  };

  const handleConversationClick = async (conversationId: string) => {
    onSelectConversation(conversationId);

    // Immediately update UI state for better UX
    // Clear newly unread status for this conversation
    setNewlyUnreadConversations(prev => {
      const updated = new Set(prev);
      updated.delete(conversationId);
      console.log(`🟢 Removed ${conversationId} from newly unread conversations`);
      return updated;
    });
    
    // Update hasNewUnreadMessages based on remaining newly unread conversations
    setHasNewUnreadMessages(prev => {
      const remainingCount = Array.from(newlyUnreadConversations).filter(id => id !== conversationId).length;
      console.log(`🟢 Remaining newly unread conversations: ${remainingCount}`);
      return remainingCount > 0;
    });

    // Update local last_seen map immediately for instant UI feedback
    const currentTime = new Date();
    setLastSeenMap(prev => {
      const updated = new Map(prev);
      updated.set(conversationId, currentTime);
      console.log(`🟢 Updated local lastSeenMap for ${conversationId}:`, currentTime.toISOString());
      return updated;
    });

    // Force a state update to trigger re-evaluation of all unread statuses
    setLastUpdateTime(new Date());
    
    // Re-evaluate all conversations' unread status with the updated lastSeenMap
    setTimeout(() => {
      const updatedNewlyUnread = new Set<string>();
      conversations.forEach(conv => {
        const lastMessageTime = new Date(conv.lastMessageAt);
        // Use the updated currentTime for this conversation, or existing time for others
        const lastSeenTime = conv.id === conversationId ? currentTime : lastSeenMap.get(conv.id);
        
        if (!lastSeenTime || lastMessageTime > lastSeenTime) {
          updatedNewlyUnread.add(conv.id);
        }
      });
      
      setNewlyUnreadConversations(updatedNewlyUnread);
      setHasNewUnreadMessages(updatedNewlyUnread.size > 0);
      console.log(`🔄 Re-evaluated newly unread conversations:`, Array.from(updatedNewlyUnread));
    }, 50); // Small delay to ensure state updates are processed

    // Update last_seen timestamp in database
    if (session?.user?.id) {
      try {
        await fetch("/api/last-seen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            conversationId, 
            timestamp: currentTime.toISOString() 
          })
        });
        console.log(`✅ Updated database last_seen for conversation ${conversationId}`);
        
      } catch (error) {
        console.error(`❌ Failed to update last_seen for conversation ${conversationId}:`, error);
        // Revert local state if database update failed
        setLastSeenMap(prev => {
          const reverted = new Map(prev);
          const conversation = conversations.find(c => c.id === conversationId);
          if (conversation) {
            const lastMessageTime = new Date(conversation.lastMessageAt);
            // Only keep as unread if message is actually newer than what we tried to set
            if (lastMessageTime > currentTime) {
              reverted.delete(conversationId); // Remove it so it shows as unread again
            } else {
              reverted.set(conversationId, currentTime); // Keep the update
            }
          }
          return reverted;
        });
        
        // Revert newly unread status too
        setNewlyUnreadConversations(prev => {
          const reverted = new Set(prev);
          const conversation = conversations.find(c => c.id === conversationId);
          if (conversation) {
            const lastMessageTime = new Date(conversation.lastMessageAt);
            if (lastMessageTime > currentTime) {
              reverted.add(conversationId);
            }
          }
          return reverted;
        });
      }
    }

    // Mark as read in local state immediately for better UX
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      )
    );

    // Mark as read on server and emit socket event
    try {
      const response = await fetch(`/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "mark_read",
        }),
      });

      if (response.ok) {
        console.log(`✅ Conversation ${conversationId} marked as read`);

        // Refresh lastSeenMap to ensure consistency
        if (session?.user?.id) {
          try {
            await loadLastSeenData();
            console.log(`🔄 Refreshed lastSeenMap after marking conversation ${conversationId} as read`);
          } catch (error) {
            console.warn("Failed to refresh lastSeenMap:", error);
          }
        }

        // Emit socket event to notify other clients
        if (socket && session?.user?.companyId) {
          socket.emit("conversation:read", {
            conversationId,
            companyId: session.user.companyId,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        console.error(
          `❌ Failed to mark conversation ${conversationId} as read`
        );
        // Revert local state if server update failed
        setConversations((prev) =>
          prev.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 1 } : conv
          )
        );
      }
    } catch (error) {
      console.error("Error marking conversation as read:", error);
      // Revert local state if request failed
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unreadCount: 1 } : conv
        )
      );
    }
  };

  if (loading) {
    return (
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3 sm:pb-6">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base">
              <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden sm:inline">Conversations</span>
              <span className="sm:hidden">Chats</span>
              {totalUnreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-1.5 sm:px-2 py-1 min-w-[18px] sm:min-w-[20px] text-center">
                  {totalUnreadCount}
                </span>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={manualRefresh}
                className="text-xs px-2 py-1 h-6"
                title="Refresh conversations"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                {isConnected ? "Live" : "Offline"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading conversations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      {/* New message notification - Responsive overlay */}
      {newMessageNotification && (
        <div 
          className="absolute top-0 left-0 right-0 bg-blue-500 text-white px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium text-center z-50 rounded-t-lg animate-in slide-in-from-top duration-300 cursor-pointer hover:bg-blue-600 transition-colors shadow-lg"
          onClick={() => setNewMessageNotification(null)}
          title="Click to dismiss"
        >
          <div className="flex items-center justify-center space-x-2">
            <span className="text-base sm:text-lg">🔔</span>
            <span className="truncate max-w-[200px] sm:max-w-none">{newMessageNotification}</span>
            <span className="text-xs opacity-75 ml-2">×</span>
          </div>
        </div>
      )}
      
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="flex-shrink-0 pb-3 sm:pb-6">
          <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-1 sm:space-x-2 text-sm sm:text-base">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Conversations</span>
            <span className="sm:hidden">Chats</span>
            {totalUnreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 sm:px-2 py-1 min-w-[18px] sm:min-w-[20px] text-center">
                {totalUnreadCount}
              </span>
            )}
          </CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={manualRefresh}
                className="text-xs px-2 py-1 h-6"
                title="Refresh conversations"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
                {isConnected ? "Live" : "Offline"}
              </Badge>
            </div>
          </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="flex space-x-1 sm:space-x-2 overflow-x-auto">
          {["ALL", "OPEN", "UNREAD"].map((filterOption) => (
            <Button
              key={filterOption}
              variant={filter === filterOption ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(filterOption as any)}
              className="flex-shrink-0 text-xs sm:text-sm px-2 sm:px-3"
            >
              <span className="hidden sm:inline">{filterOption}</span>
              <span className="sm:hidden">
                {filterOption === "ALL" ? "All" : filterOption === "OPEN" ? "Open" : "New"}
              </span>
              {filterOption === "UNREAD" && (
                <>
                  {conversations.filter((c) => isConversationUnread(c)).length > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1">
                      {conversations.filter((c) => isConversationUnread(c)).length}
                    </span>
                  )}
                  {hasNewUnreadMessages && (
                    <span className="ml-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </>
              )}
            </Button>
          ))}

        </div>
      </CardHeader>

      <CardContent 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 max-h-[500px] overflow-y-auto p-0"
      >
        <div className="divide-y">
          {filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleConversationClick(conversation.id)}
              className={`p-3 sm:p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                selectedConversationId === conversation.id
                  ? "bg-blue-50 border-r-2 border-blue-500"
                  : newlyUnreadConversations.has(conversation.id)
                  ? "bg-red-50 border-l-2 border-red-300"
                  : ""
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <div className="w-8 h-8">
                      {conversation.customerProfile?.profilePicture && !profilePhotoErrors.has(conversation.id) ? (
                        <img
                          src={conversation.customerProfile.profilePicture}
                          alt={conversation.customerProfile.fullName}
                          className="w-8 h-8 rounded-full border-2 border-blue-500 object-cover"
                          onError={() => handleProfilePhotoError(conversation.id)}
                        />
                      ) : (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-500">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                    </div>
                    {newlyUnreadConversations.has(conversation.id) && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">
                      {conversation.customerName ||
                        `Customer ${conversation.psid.slice(-4)}`}
                    </h4>
                    <div className="flex items-center space-x-1 sm:space-x-2 text-xs text-gray-500">
                      <span className="hidden sm:inline">{conversation.messageCount} messages</span>
                      <span className="sm:inline hidden">•</span>
                      <span>{getTimeAgo(conversation.lastMessageAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <TooltipProvider>
                    {conversation.platform === "WIDGET" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <WidgetIcon 
                              size={16} 
                              className="text-purple-500"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Chat Widget</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : conversation.platform === "INSTAGRAM" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <InstagramIcon 
                              size={16} 
                              className="text-pink-500"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Instagram Direct Message{conversation.customerProfile?.instagramUrl ? ` - @${conversation.customerProfile.instagramUrl.split('/').pop()}` : ''}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : conversation.platform === "TELEGRAM" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <TelegramIcon 
                              size={16} 
                              className="text-blue-400"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Telegram{conversation.pageName ? ` - ${conversation.pageName}` : ''}</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help">
                            <FacebookIcon 
                              size={16} 
                              className="text-blue-500"
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Facebook Messenger{conversation.pageName ? ` - ${conversation.pageName}` : ''}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TooltipProvider>

                  {conversation.unreadCount > 0 && (
                    <div className="flex items-center space-x-1">
                      {newlyUnreadConversations.has(conversation.id) && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      )}
                      <span className={`text-xs font-medium ${
                        newlyUnreadConversations.has(conversation.id) ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {conversation.unreadCount}
                      </span>
                    </div>
                  )}

                  {conversation.autoBot && (
                    <Bot className="h-3 w-3 text-purple-600" />
                  )}

                  <Badge
                    className={`text-xs ${getStatusColor(conversation.status)}`}
                  >
                    {conversation.status}
                  </Badge>
                </div>
              </div>

              {/* Typing indicator or last message */}
              {conversation.isTyping ? (
                <div className="flex items-center space-x-2 text-sm">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                    <div
                      className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-blue-600 text-xs italic">
                    Agent is typing...
                  </span>
                </div>
              ) : conversation.lastMessage ? (
                <div className="flex items-center space-x-2 text-sm">
                  {conversation.lastMessage.role === "USER" ? (
                    <User className="h-3 w-3 text-blue-600" />
                  ) : conversation.lastMessage.role === "BOT" ? (
                    <Bot className="h-3 w-3 text-purple-600" />
                  ) : (
                    <MessageSquare className="h-3 w-3 text-green-600" />
                  )}
                  <span className="text-gray-600 truncate">
                    {conversation.lastMessage.text}
                  </span>
                </div>
              ) : null}
            </div>
          ))}

          {filteredConversations.length === 0 && !loading && (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No conversations found
              </h3>
              <p className="text-gray-600">
                {searchTerm || filter !== "ALL"
                  ? "Try adjusting your search or filters."
                  : "Conversations will appear here when customers message your bot."}
              </p>
            </div>
          )}
          
          {/* Loading more indicator */}
          {loadingMore && (
            <div className="p-4 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
              <p className="text-sm text-gray-600 mt-2">Loading more conversations...</p>
            </div>
          )}
          
          {/* End of list indicator */}
          {!hasMore && filteredConversations.length > 0 && !loading && (
            <div className="p-4 text-center text-sm text-gray-500">
              <Circle className="h-4 w-4 mx-auto mb-1 fill-gray-400" />
              All conversations loaded
            </div>
          )}
        </div>
      </CardContent>
    </Card>
    </div>
  );
}

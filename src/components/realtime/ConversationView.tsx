"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSocket } from "@/hooks/useSocket";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FacebookIcon } from "@/components/ui/facebook-icon";
import { InstagramIcon } from "@/components/ui/instagram-icon";
import { TelegramIcon } from "@/components/ui/telegram-icon";
import { WidgetIcon } from "@/components/ui/widget-icon";
import {
  User,
  Bot,
  Send,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Info,
  Ticket,
  RefreshCw,
  Image as ImageIcon,
  X,
  Paperclip,
  Zap,
  XCircle,
} from "lucide-react";
import CustomerInfoSidebar from "./CustomerInfoSidebar";
import CreateTicketModal from "@/components/freshdesk/CreateTicketModal";
import CannedResponseDropdown, { CannedResponse } from "./CannedResponseDropdown";
import { replaceVariables, VariableContext } from "@/lib/canned-response-variables";

interface Message {
  id: string;
  text: string;
  role: "USER" | "AGENT" | "BOT";
  createdAt: string;
  meta?: any;
}

interface CustomerProfile {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profilePicture?: string;
  locale?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  platform?: string;
  cached?: boolean;
  error?: string;
}

interface Conversation {
  id: string;
  psid: string;
  platform: "FACEBOOK" | "INSTAGRAM" | "TELEGRAM" | "WIDGET";
  status: "OPEN" | "SNOOZED" | "CLOSED";
  autoBot: boolean;
  customerName?: string;
  customerProfile?: CustomerProfile;
  pageName?: string;
  messages: Message[];
  notes?: string;
  tags?: string[];
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  meta?: any; // Metadata including Telegram username, userId, etc.
  freshdeskTickets?: Array<{
    id: number;
    url: string;
    subject: string;
    status: number;
    priority: number;
    createdAt: string;
  }>;
}

interface ConversationViewProps {
  readonly conversationId: string;
  readonly initialConversation?: Conversation;
}

export default function ConversationView({
  conversationId,
  initialConversation,
}: ConversationViewProps) {
  const { data: session } = useSession();
  const {
    socket,
    isConnected,
    joinConversation,
    leaveConversation,
    sendTyping,
  } = useSocket();
  const [conversation, setConversation] = useState<Conversation | null>(
    initialConversation || null
  );
  const [messages, setMessages] = useState<Message[]>(
    initialConversation?.messages || []
  );
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(
      initialConversation?.customerProfile || null
    );
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState<string[]>([]);
  const [loading, setLoading] = useState(!initialConversation);
  const [profileLoading, setProfileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createTicketModalOpen, setCreateTicketModalOpen] = useState(false);
  const [showCloseConfirmDialog, setShowCloseConfirmDialog] = useState(false);
  const [closingChat, setClosingChat] = useState(false);
  const [isCustomerOnline, setIsCustomerOnline] = useState<boolean | null>(null);
  const [profilePhotoError, setProfilePhotoError] = useState(false);
  
  // Canned responses states
  const [showCannedDropdown, setShowCannedDropdown] = useState(false);
  const [cannedSearchQuery, setCannedSearchQuery] = useState("");
  const [cannedTriggerPosition, setCannedTriggerPosition] = useState<{ top: number; left: number } | undefined>();
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Image attachment states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageValidationError, setImageValidationError] = useState<string | null>(null);
  
  // Pagination states
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const currentConversationRef = useRef<string | null>(null);
  const previousScrollHeightRef = useRef<number>(0);
  const isInitialLoadRef = useRef<boolean>(true);
  const lastScrollTopRef = useRef<number>(0);
  const previousMessageCountRef = useRef<number>(0);
  const scrollDebounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isFetchingRef = useRef<boolean>(false);
  const isLoadingOlderRef = useRef<boolean>(false);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Smart scroll - only on initial load or new messages
  useEffect(() => {
    const currentCount = messages.length;
    const previousCount = previousMessageCountRef.current;
    
    // Initial load - scroll to bottom
    if (isInitialLoadRef.current && currentCount > 0) {
      scrollToBottom();
      previousMessageCountRef.current = currentCount;
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 1000);
      return;
    }
    
    // After initial load, only auto-scroll if NEW messages were ADDED (not prepended)
    // Don't scroll if we just loaded older messages
    if (!isInitialLoadRef.current && currentCount > previousCount) {
      // Only scroll if NOT loading older messages
      if (!isLoadingOlderRef.current) {
        scrollToBottom();
      } else {
        // Reset the flag after loading older messages
        isLoadingOlderRef.current = false;
      }
    }
    
    previousMessageCountRef.current = currentCount;
  }, [messages.length, loadingMore]);

  // Setup scroll listener for loading older messages
  useEffect(() => {
    const timer = setTimeout(() => {
      const scrollContainer = messagesContainerRef.current;
      
      if (!scrollContainer) {
        return;
      }

      const viewport = scrollContainer.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
      
      if (!viewport) {
        return;
      }

      const handleScroll = () => {
        if (scrollDebounceRef.current) {
          clearTimeout(scrollDebounceRef.current);
        }
        
        scrollDebounceRef.current = setTimeout(() => {
          const { scrollTop, scrollHeight, clientHeight } = viewport;
          
          if (isInitialLoadRef.current || isFetchingRef.current) {
            return;
          }
          
          const isScrollingUp = scrollTop < lastScrollTopRef.current;
          lastScrollTopRef.current = scrollTop;
          
          if (!isScrollingUp || loadingMore || !hasMore) {
            return;
          }

          previousScrollHeightRef.current = scrollHeight;

          if (scrollTop < 300) {
            fetchMessages(true);
          }
        }, 150);
      };

      viewport.addEventListener('scroll', handleScroll);
      
      return () => {
        viewport.removeEventListener('scroll', handleScroll);
        if (scrollDebounceRef.current) {
          clearTimeout(scrollDebounceRef.current);
        }
      };
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scrollDebounceRef.current) {
        clearTimeout(scrollDebounceRef.current);
      }
    };
  }, [loadingMore, hasMore, conversationId, messages.length]);

  // Reset state when conversationId changes
  useEffect(() => {
    console.log(`🔄 ConversationView: Conversation changed to ${conversationId}`);
    
    // Track current conversation to prevent stale updates
    currentConversationRef.current = conversationId;
    
    // Reset all state for new conversation
    setConversation(initialConversation || null);
    setMessages([]); // Always start with empty messages - fetchMessages will load them
    setCustomerProfile(initialConversation?.customerProfile || null);
    setError(null);
    setNewMessage("");
    setSelectedImage(null);
    setImagePreview(null);
    setUploadingImage(false);
    setIsTyping(false);
    setOtherTyping([]);
    setLoading(!initialConversation);
    setProfileLoading(false);
    setProfilePhotoError(false); // Reset profile photo error state
    setLoadingMore(false);
    setHasMore(true);
    setCursor(null);
    
    // Reset refs for scroll management
    isInitialLoadRef.current = true;
    lastScrollTopRef.current = 0;
    previousScrollHeightRef.current = 0;
    previousMessageCountRef.current = 0;
    isFetchingRef.current = false;
    isLoadingOlderRef.current = false;
    if (scrollDebounceRef.current) {
      clearTimeout(scrollDebounceRef.current);
    }
    
    // Always fetch messages with pagination
    if (conversationId) {
      if (!initialConversation) {
        fetchConversation();
      } else {
        fetchMessages();
      }
    }
  }, [conversationId, initialConversation]);

  // Fetch customer profile for each conversation
  useEffect(() => {
    if (conversationId && conversation && !profileLoading) {
      console.log(`📊 Starting profile fetch for conversation ${conversationId} (platform: ${conversation.platform})`);
      fetchCustomerProfile();
    }
  }, [conversationId, conversation?.id]); // Depend on conversationId and conversation.id to ensure conversation data is loaded

  // Check customer online status for widget conversations
  useEffect(() => {
    if (!conversation || conversation.platform !== "WIDGET") {
      setIsCustomerOnline(null);
      return;
    }

    // Initial check
    checkCustomerOnlineStatus();

    // Poll every 10 seconds
    const interval = setInterval(() => {
      checkCustomerOnlineStatus();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, [conversationId, conversation?.platform]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !conversationId) return;

    console.log(
      `🔌 ConversationView: Setting up socket for conversation ${conversationId}`
    );

    // Join conversation room
    joinConversation(conversationId);

  // Listen for new messages
    socket.on(
      "message:new",
      (data: { message: Message; conversation: any }) => {
        console.log(
          `📥 ConversationView: Received message:new for conversation ${conversationId}`,
          data
        );

        // Only add message if it belongs to this conversation
        if (data.conversation?.id === conversationId) {
          setMessages((prev) => {
            // Check if message already exists (either by ID or as optimistic message)
            const exists = prev.find(
              (msg) =>
                msg.id === data.message.id ||
                (msg.id.startsWith("temp-") &&
                  msg.text === data.message.text &&
                  msg.role === data.message.role)
            );
            if (exists) {
              console.log(
                `⚠️ Message ${data.message.id} already exists or is optimistic, updating instead of adding`
              );
              // Update the existing message instead of adding duplicate
              return prev.map((msg) =>
                msg.id === exists.id ? { ...data.message } : msg
              );
            }
            console.log(
              `✅ Adding new message ${data.message.id} to conversation`
            );
            return [...prev, data.message];
          });

          // Update conversation if provided
          if (data.conversation) {
            setConversation((prev) =>
              prev ? { ...prev, ...data.conversation } : null
            );
          }

        } else {
          console.log(
            `⚠️ Message not for this conversation (expected ${conversationId}, got ${data.conversation?.id})`
          );
        }
      }
    );

    // Listen for message delivery confirmations
    socket.on(
      "message:sent",
      (data: {
        messageId: string;
        facebookMessageId: string;
        sentAt: string;
      }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? {
                  ...msg,
                  meta: { ...msg.meta, sent: true, sentAt: data.sentAt },
                }
              : msg
          )
        );
      }
    );

    // Listen for typing indicators
    socket.on(
      "typing:start",
      (data: { userId: string; conversationId: string }) => {
        setOtherTyping((prev) => [
          ...prev.filter((id) => id !== data.userId),
          data.userId,
        ]);
      }
    );

    socket.on(
      "typing:stop",
      (data: { userId: string; conversationId: string }) => {
        setOtherTyping((prev) => prev.filter((id) => id !== data.userId));
      }
    );

    // Listen for errors
    socket.on("error", (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      console.log(
        `🔌 ConversationView: Cleaning up socket for conversation ${conversationId}`
      );
      leaveConversation(conversationId);
      socket.off("message:new");
      socket.off("message:sent");
      socket.off("typing:start");
      socket.off("typing:stop");
      socket.off("error");
    };
  }, [socket, conversationId, joinConversation, leaveConversation]);

  const fetchMessages = async (loadMore = false) => {
    // Don't fetch if already fetching
    if (isFetchingRef.current) {
      return;
    }
    
    // Don't fetch if already loading or no more messages
    if (loadMore && (loadingMore || !hasMore)) {
      return;
    }
    
    try {
      isFetchingRef.current = true;
      
      if (loadMore) {
        setLoadingMore(true);
        isLoadingOlderRef.current = true;
      }

      const limit = 10;
      const url = loadMore && cursor 
        ? `/api/conversations/${conversationId}/messages?limit=${limit}&cursor=${cursor}`
        : `/api/conversations/${conversationId}/messages?limit=${limit}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();
      
      const newHasMore = data.pagination?.hasMore || false;
      const newCursor = data.pagination?.nextCursor || null;
      
      setHasMore(newHasMore);
      setCursor(newCursor);

      if (loadMore) {
        // Store current scroll position BEFORE updating messages
        let currentScrollHeight = 0;
        let currentScrollTop = 0;
        
        if (messagesContainerRef.current && !isInitialLoadRef.current) {
          const viewport = messagesContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
          if (viewport) {
            currentScrollHeight = viewport.scrollHeight;
            currentScrollTop = viewport.scrollTop;
          }
        }
        
        // Prepend older messages and remove duplicates
        setMessages((prev) => {
          const existingIds = new Set(prev.map(m => m.id));
          const newMessages = data.messages.filter((m: any) => !existingIds.has(m.id));
          return [...newMessages, ...prev];
        });
        
        // Restore scroll position after adding messages to top
        if (!isInitialLoadRef.current && currentScrollHeight > 0) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (messagesContainerRef.current) {
                const viewport = messagesContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
                if (viewport) {
                  const newScrollHeight = viewport.scrollHeight;
                  const heightDiff = newScrollHeight - currentScrollHeight;
                  
                  // Adjust scroll position to maintain visual position
                  viewport.scrollTop = currentScrollTop + heightDiff;
                }
              }
            });
          });
        }
      } else {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
    } finally {
      if (loadMore) {
        setLoadingMore(false);
      }
      isFetchingRef.current = false;
    }
  };

  // Function to refresh profile when image fails to load
  const handleProfilePhotoError = async () => {
    if (profilePhotoError) return; // Prevent infinite loop
    
    console.log("📸 Profile photo failed to load, refreshing profile data...");
    setProfilePhotoError(true);
    
    try {
      const response = await fetch(`/api/conversations/${conversationId}/customer-profile?force=true`);
      if (response.ok) {
        const data = await response.json();
        setCustomerProfile(data.profile);
        console.log("✅ Profile data refreshed successfully");
      }
    } catch (err) {
      console.error("❌ Failed to refresh profile:", err);
    }
  };

  const fetchConversation = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/conversations/${conversationId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch conversation");
      }

      const data = await response.json();
      setConversation(data.conversation);
      // Don't set messages here - let fetchMessages handle pagination
      
      // Fetch paginated messages
      await fetchMessages();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load conversation"
      );
    } finally {
      setLoading(false);
    }
  };

  const checkCustomerOnlineStatus = async () => {
    if (!conversation || conversation.platform !== "WIDGET") {
      setIsCustomerOnline(null);
      return;
    }

    try {
      const response = await fetch(
        `/api/widget/presence?conversationId=${conversationId}`
      );

      if (!response.ok) {
        setIsCustomerOnline(false);
        return;
      }

      const data = await response.json();
      setIsCustomerOnline(data.isOnline || false);
    } catch (err) {
      console.error("Error checking customer online status:", err);
      setIsCustomerOnline(false);
    }
  };

  const fetchCustomerProfile = async () => {
    try {
      setProfileLoading(true);
      // Clear existing profile first to prevent showing wrong profile
      setCustomerProfile(null);
      
      console.log(`📊 Fetching customer profile for conversation ${conversationId}`);
      
      const response = await fetch(
        `/api/conversations/${conversationId}/customer-profile`
      );

      if (!response.ok) {
        console.warn("Failed to fetch customer profile, using fallback");
        // Create platform-specific fallback profile (only if this is still the current conversation)
        if (conversation?.psid && currentConversationRef.current === conversationId) {
          const platform = conversation.platform;
          const isInstagram = platform === "INSTAGRAM";
          const isTelegram = platform === "TELEGRAM";
          const isWidget = platform === "WIDGET";
          
          let firstName, fullName, platformUrl, platformName;
          
          if (isTelegram) {
            // Use actual customer name from conversation if available
            firstName = conversation.customerName?.split(' ')[0] || "Telegram User";
            fullName = conversation.customerName || `Telegram User ${conversation.psid.slice(-4)}`;
            platformUrl = undefined;
            platformName = "telegram";
          } else if (isInstagram) {
            firstName = "Instagram User";
            fullName = `Instagram User #${conversation.psid.slice(-4)}`;
            platformUrl = `https://www.instagram.com/direct/t/${conversation.psid}`;
            platformName = "instagram";
          } else if (isWidget) {
            firstName = "Website Visitor";
            fullName = conversation.customerName || `Visitor ${conversation.psid.slice(-4)}`;
            platformUrl = undefined;
            platformName = "widget";
          } else {
            firstName = "Customer";
            fullName = `Customer #${conversation.psid.slice(-4)}`;
            platformUrl = `https://www.facebook.com/${conversation.psid}`;
            platformName = "facebook";
          }
          
          console.log(`🚪 Using fallback profile for failed fetch ${conversationId} (${platformName})`);
          setCustomerProfile({
            id: conversation.psid,
            firstName: firstName,
            lastName: `#${conversation.psid.slice(-4)}`,
            fullName: fullName,
            locale: "en_US",
            facebookUrl: !isInstagram && !isTelegram && !isWidget ? platformUrl : undefined,
            instagramUrl: isInstagram ? platformUrl : undefined,
            platform: platformName,
            error: "Profile fetch failed",
          });
        }
        return;
      }

      const data = await response.json();
      
      // Only update if this is still the current conversation (prevents race conditions)
      if (currentConversationRef.current === conversationId) {
        console.log(`✅ Fetched customer profile for ${conversationId}:`, data.profile);
        setCustomerProfile(data.profile);
      } else {
        console.log(`⚠️ Discarding stale profile for ${conversationId}, current conversation is ${currentConversationRef.current}`);
      }
    } catch (err) {
      console.error("Error fetching customer profile:", err);
      // Use fallback profile (only if this is still the current conversation)
      if (conversation?.psid && currentConversationRef.current === conversationId) {
        const platform = conversation.platform;
        const isInstagram = platform === "INSTAGRAM";
        const isTelegram = platform === "TELEGRAM";
        const isWidget = platform === "WIDGET";
        
        let firstName, fullName, platformUrl, platformName;
        
        if (isTelegram) {
          // Use actual customer name from conversation if available
          firstName = conversation.customerName?.split(' ')[0] || "Telegram User";
          fullName = conversation.customerName || `Telegram User ${conversation.psid.slice(-4)}`;
          platformUrl = undefined;
          platformName = "telegram";
        } else if (isInstagram) {
          firstName = "Instagram User";
          fullName = `Instagram User #${conversation.psid.slice(-4)}`;
          platformUrl = `https://www.instagram.com/direct/t/${conversation.psid}`;
          platformName = "instagram";
        } else if (isWidget) {
          firstName = "Website Visitor";
          fullName = conversation.customerName || `Visitor ${conversation.psid.slice(-4)}`;
          platformUrl = undefined;
          platformName = "widget";
        } else {
          firstName = "Customer";
          fullName = `Customer #${conversation.psid.slice(-4)}`;
          platformUrl = `https://www.facebook.com/${conversation.psid}`;
          platformName = "facebook";
        }
        
        console.log(`🚪 Using fallback profile for ${conversationId} (${platformName})`);
        setCustomerProfile({
          id: conversation.psid,
          firstName: firstName,
          lastName: `#${conversation.psid.slice(-4)}`,
          fullName: fullName,
          locale: "en_US",
          facebookUrl: !isInstagram && !isTelegram && !isWidget ? platformUrl : undefined,
          instagramUrl: isInstagram ? platformUrl : undefined,
          platform: platformName,
          error: "Profile fetch failed",
        });
      }
    } finally {
      setProfileLoading(false);
    }
  };

  const handleToggleBot = async () => {
    if (!conversation?.id) return;

    const newAutoBotStatus = !conversation.autoBot;

    // Optimistically update UI
    setConversation((prev) =>
      prev ? { ...prev, autoBot: newAutoBotStatus } : null
    );

    try {
      const response = await fetch(
        `/api/conversations/${conversation.id}/bot-settings`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            autoBot: newAutoBotStatus,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update bot settings");
      }

      console.log(
        `🤖 Auto bot ${
          newAutoBotStatus ? "enabled" : "disabled"
        } for conversation ${conversation.id}`
      );

    } catch (error) {
      console.error("Failed to update bot settings:", error);
      // Revert optimistic update
      setConversation((prev) =>
        prev ? { ...prev, autoBot: !newAutoBotStatus } : null
      );
      setError("Failed to update bot settings. Please try again.");
    }
  };

  const handleCloseChat = async () => {
    if (!conversation?.id) return;

    setClosingChat(true);
    try {
      const response = await fetch(`/api/conversations/${conversation.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "close",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to close conversation");
      }

      const data = await response.json();

      // Update conversation status
      setConversation((prev) =>
        prev ? { ...prev, status: "CLOSED" } : null
      );

      // Close the dialog
      setShowCloseConfirmDialog(false);

      // Emit socket event to notify other clients
      if (socket && isConnected) {
        socket.emit("conversation:closed", {
          conversationId: conversation.id,
        });
      }
    } catch (error) {
      console.error("Error closing chat:", error);
      setError("Failed to close chat. Please try again.");
    } finally {
      setClosingChat(false);
    }
  };

  // Handle image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Platform-specific validation
    const platform = conversation?.platform;
    
    // Instagram only supports PNG, JPEG, and GIF (no WebP)
    // Per Instagram API docs: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/send-messages
    const isInstagram = platform === "INSTAGRAM";
    const allowedTypes = isInstagram 
      ? ["image/jpeg", "image/jpg", "image/png", "image/gif"]
      : ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    
    if (!allowedTypes.includes(file.type)) {
      if (isInstagram && file.type === "image/webp") {
        setImageValidationError("Instagram doesn't support WebP images. Please use JPEG, PNG, or GIF format.");
      } else {
        setImageValidationError(`Invalid file type. Only ${isInstagram ? "JPEG, PNG, and GIF" : "JPEG, PNG, WebP, and GIF"} images are allowed.`);
      }
      e.target.value = ""; // Reset input
      return;
    }

    // Instagram has 8MB limit, others 10MB
    const maxSize = isInstagram ? 8 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setImageValidationError(`File too large. Maximum size is ${isInstagram ? "8MB for Instagram" : "10MB"}.`);
      e.target.value = ""; // Reset input
      return;
    }

    setSelectedImage(file);
    
    // Create preview URL using FileReader for better cross-browser compatibility
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    e.target.value = "";
  };

  // Remove selected image
  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !conversationId) return;

    const messageText = newMessage.trim();
    const imageToSend = selectedImage;
    const imagePreviewUrl = imagePreview;
    
    setNewMessage("");
    setSelectedImage(null);
    setImagePreview(null);
    setUploadingImage(true);

    // Add message optimistically to UI with agent info
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      text: messageText,
      role: "AGENT",
      createdAt: new Date().toISOString(),
      meta: { 
        sending: true,
        agentName: session?.user?.name || undefined,
        agentPhoto: session?.user?.image || undefined,
        ...(imagePreviewUrl && { 
          image: { 
            url: imagePreviewUrl, 
            filename: imageToSend?.name || "image",
            contentType: imageToSend?.type || "image/jpeg"
          } 
        }),
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      let response;
      
      if (imageToSend) {
        // Send as multipart/form-data with image
        const formData = new FormData();
        formData.append("conversationId", conversationId);
        formData.append("text", messageText);
        formData.append("image", imageToSend);
        
        response = await fetch("/api/messages/send", {
          method: "POST",
          body: formData,
        });
      } else {
        // Send as JSON (text only)
        response = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId,
            text: messageText,
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send message");
      }

      const data = await response.json();

      // Update the optimistic message with real data
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === optimisticMessage.id
            ? {
                ...data.message,
                meta: { 
                  ...data.message.meta, 
                  sent: true,
                  agentName: data.message.meta?.agentName || optimisticMessage.meta?.agentName,
                  agentPhoto: data.message.meta?.agentPhoto || optimisticMessage.meta?.agentPhoto,
                },
              }
            : msg
        )
      );

      console.log(
        `✅ Updated optimistic message ${optimisticMessage.id} with real message ${data.message.id}`
      );


      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        sendTyping(conversationId, false);
        
      }
      
      setUploadingImage(false);
    } catch (err) {
      console.error("Failed to send message:", err);
      // Remove the failed message and show error
      setMessages((prev) =>
        prev.filter((msg) => msg.id !== optimisticMessage.id)
      );
      setError(err instanceof Error ? err.message : "Failed to send message");
      setUploadingImage(false);
    }
  };

  // Handle canned response selection
  const handleCannedResponseSelect = async (response: CannedResponse) => {
    // Build variable context
    const context: VariableContext = {
      customerName: conversation?.customerName || conversation?.customerProfile?.fullName,
      customerEmail: conversation?.customerEmail || undefined,
      customerPhone: conversation?.customerPhone || undefined,
      platform: conversation?.platform,
      agentName: session?.user?.name || undefined,
    };

    // Replace variables in content
    const processedContent = replaceVariables(response.content, context);

    // Replace the /shortcut in the message with the processed content
    const words = newMessage.split(" ");
    const lastWord = words.pop() || "";
    if (lastWord.startsWith("/")) {
      words.push(processedContent);
      setNewMessage(words.join(" "));
    } else {
      setNewMessage(newMessage + " " + processedContent);
    }

    // Close dropdown
    setShowCannedDropdown(false);

    // Focus back on input
    messageInputRef.current?.focus();

    // Auto-resize textarea
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = Math.min(messageInputRef.current.scrollHeight, 200) + 'px';
    }

    // Increment usage count
    try {
      await fetch(`/api/canned-responses/${response.id}/increment-usage`, {
        method: "POST",
      });
    } catch (error) {
      console.error("Failed to increment usage count:", error);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter to send (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter or Ctrl+Enter for new line (default textarea behavior)
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);

    // Auto-resize textarea
    if (messageInputRef.current) {
      messageInputRef.current.style.height = 'auto';
      messageInputRef.current.style.height = Math.min(messageInputRef.current.scrollHeight, 200) + 'px';
    }

    // Detect canned response trigger "/"
    const lastWord = value.split(" ").pop() || "";
    if (lastWord.startsWith("/") && lastWord.length > 1) {
      const searchQuery = lastWord.substring(1); // Remove the "/"
      setCannedSearchQuery(searchQuery);
      setShowCannedDropdown(true);
    } else if (lastWord === "/") {
      setCannedSearchQuery("");
      setShowCannedDropdown(true);
    } else {
      setShowCannedDropdown(false);
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Start typing if not already
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      sendTyping(conversationId, true);
      
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        sendTyping(conversationId, false);
        
      }
    }, 3000);
  };

  const handleNotesUpdate = (notes: string) => {
    setConversation((prev) => (prev ? { ...prev, notes } : null));
  };

  const handleTagsUpdate = (tags: string[]) => {
    setConversation((prev) => (prev ? { ...prev, tags } : null));
  };

  const handleContactUpdate = (
    field: "email" | "phone" | "address",
    value: string
  ) => {
    setConversation((prev) => {
      if (!prev) return null;
      const updateField =
        field === "email"
          ? "customerEmail"
          : field === "phone"
          ? "customerPhone"
          : "customerAddress";
      return { ...prev, [updateField]: value };
    });
  };

  const getMessageBgColor = (role: string) => {
    switch (role) {
      case "USER":
        return "bg-blue-100 text-blue-900";
      case "BOT":
        return "bg-purple-100 text-purple-900";
      default:
        return "bg-green-100 text-green-900";
    }
  };

  const getMessageIcon = (role: string, meta?: any) => {
    switch (role) {
      case "USER":
        return <User className="h-4 w-4 text-blue-600" />;
      case "BOT":
        return <Bot className="h-4 w-4 text-purple-600" />;
      case "AGENT":
        return <MessageSquare className="h-4 w-4 text-green-600" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-600" />;
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateSeparator = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    }

    // Otherwise show full date
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const shouldShowDateSeparator = (currentMessage: Message, previousMessage: Message | null) => {
    if (!previousMessage) return true;
    
    const currentDate = new Date(currentMessage.createdAt).toDateString();
    const previousDate = new Date(previousMessage.createdAt).toDateString();
    
    return currentDate !== previousDate;
  };

  if (loading) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading conversation...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchConversation}>Retry</Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="relative">
      <Card className="h-[600px] flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Customer Profile Section */}
              <div className="flex items-center space-x-2">
                {customerProfile?.profilePicture && !profilePhotoError ? (
                  <img
                    src={customerProfile.profilePicture}
                    alt={customerProfile.fullName}
                    className="w-8 h-8 rounded-full border-2 border-blue-500"
                    onError={handleProfilePhotoError}
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-500">
                    <User className="h-4 w-4 text-blue-600" />
                  </div>
                )}
                <div className="flex flex-col">
                  <CardTitle className="flex items-center space-x-2 text-base">
                    {customerProfile && (customerProfile.facebookUrl || customerProfile.instagramUrl) ? (
                      <a
                        href={customerProfile.facebookUrl || customerProfile.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 transition-colors flex items-center space-x-1"
                      >
                        <span>{customerProfile.fullName}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : customerProfile?.fullName ? (
                      <span>{customerProfile.fullName}</span>
                    ) : conversation?.customerName ? (
                      <span>{conversation.customerName}</span>
                    ) : profileLoading ? (
                      <span className="text-sm text-gray-500">
                        Loading profile...
                      </span>
                    ) : (
                      <span>
                        {`Customer ${conversation?.psid?.slice(-4)}`}
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <TooltipProvider>
                      {conversation?.platform === "INSTAGRAM" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <InstagramIcon size={16} className="text-pink-500" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Instagram</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : conversation?.platform === "TELEGRAM" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <TelegramIcon size={16} className="text-blue-400" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Telegram{conversation?.pageName ? ` - ${conversation.pageName}` : ''}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : conversation?.platform === "WIDGET" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <WidgetIcon size={16} className="text-purple-500" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Chat Widget</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="cursor-help">
                              <FacebookIcon size={16} className="text-blue-500" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Facebook</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </TooltipProvider>
                    
                    {/* Online/Offline status for Widget */}
                    {conversation?.platform === "WIDGET" && isCustomerOnline !== null && (
                      <>
                        <span>•</span>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${isCustomerOnline ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                          <span className={isCustomerOnline ? 'text-green-600 font-medium' : 'text-gray-500'}>
                            {isCustomerOnline ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </>
                    )}
                    
                    {/* Show @username for Telegram */}
                    {conversation?.platform === "TELEGRAM" && (conversation?.meta as any)?.username && (
                      <>
                        <span>•</span>
                        <span className="text-gray-500">
                          @{(conversation.meta as any).username}
                        </span>
                      </>
                    )}
                    
                    {conversation?.pageName && conversation?.platform !== "WIDGET" && conversation?.platform !== "TELEGRAM" && (
                      <>
                        <span>•</span>
                        <span className="text-gray-400" title={conversation.pageName}>
                          {conversation.pageName}
                        </span>
                      </>
                    )}
                    {customerProfile?.error && conversation?.platform !== "TELEGRAM" && (
                      <span className="text-red-500">
                        • Profile unavailable
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Auto Bot:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={conversation?.autoBot || false}
                    onChange={handleToggleBot}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
              <Badge
                variant={
                  conversation?.status === "OPEN" 
                    ? "default" 
                    : conversation?.status === "CLOSED" 
                    ? "destructive" 
                    : "secondary"
                }
              >
                {conversation?.status}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="flex items-center gap-2"
              >
                <Info className="h-4 w-4" />
                Customer Info
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateTicketModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Ticket className="h-4 w-4" />
                Create Ticket
              </Button>
              {conversation?.status !== "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCloseConfirmDialog(true)}
                  className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4" />
                  Close Chat
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Messages */}
          <ScrollArea ref={messagesContainerRef} className="flex-1 max-h-[400px] p-4 overflow-y-auto">
            {/* Load More button and status indicators */}
            {messages.length > 0 && (
              <div className="mb-4">
                {loadingMore ? (
                  <div className="flex justify-center items-center py-3 bg-blue-50 rounded-lg">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm font-medium text-blue-700">Loading older messages...</span>
                  </div>
                ) : hasMore ? (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchMessages(true)}
                      disabled={loadingMore}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Load Older Messages
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-center items-center py-2">
                    <div className="h-3 w-3 rounded-full bg-gray-400 mr-2"></div>
                    <span className="text-xs text-gray-500">Beginning of conversation</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="space-y-4">
              {messages.map((message, index) => {
                const previousMessage = index > 0 ? messages[index - 1] : null;
                const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
                
                return (
                  <div key={message.id}>
                    {/* Day separator */}
                    {showDateSeparator && (
                      <div className="flex items-center justify-center my-4">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="px-4 text-xs font-medium text-gray-500 bg-gray-50 rounded-full py-1">
                          {formatDateSeparator(message.createdAt)}
                        </span>
                        <div className="flex-grow border-t border-gray-300"></div>
                      </div>
                    )}
                    
                    <div
                      className={`flex items-start space-x-3 ${
                        message.role === "USER" ? "justify-start" : "justify-end"
                      }`}
                    >
                      {/* Left side - Customer icon */}
                      {message.role === "USER" && (
                        <div className="flex-shrink-0 mt-1">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                      )}
                      
                      {/* Message content */}
                      <div className={`flex flex-col max-w-xs lg:max-w-md ${message.role !== "USER" ? "items-end" : ""}`}>
                        {/* Agent name (for agent messages on right) */}
                        {message.role === "AGENT" && message.meta?.agentName && (
                          <span className="text-xs text-gray-600 mb-1 mr-1">
                            {message.meta.agentName}
                          </span>
                        )}
                        
                        <div
                          className={`p-3 rounded-lg ${getMessageBgColor(
                            message.role
                          )}`}
                        >
                          {message.text && <p className="text-sm">{message.text}</p>}
                          
                          {/* Display image if present */}
                          {message.meta?.image?.url && (
                            <div className={message.text ? "mt-2" : ""}>
                              <img 
                                src={message.meta.image.url} 
                                alt={message.meta.image.filename || "Attachment"}
                                className="max-w-xs max-h-64 rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(message.meta.image.url, '_blank')}
                                loading="lazy"
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          {message.meta?.sending ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                              <span className="text-xs text-gray-500">Sending...</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-gray-500">
                                {formatTime(message.createdAt)}
                              </span>
                              {message.meta?.sent && (
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              )}
                              {message.role === "BOT" && message.meta?.model && (
                                <span className="text-xs text-gray-400">
                                  {message.meta.model}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Right side - Agent/Bot icon */}
                      {message.role !== "USER" && (
                        <div className="flex-shrink-0 mt-1">
                          {message.role === "AGENT" && message.meta?.agentPhoto ? (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={message.meta.agentPhoto} alt={message.meta.agentName || "Agent"} />
                              <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                                {message.meta.agentName?.charAt(0).toUpperCase() || "A"}
                              </AvatarFallback>
                            </Avatar>
                          ) : message.role === "AGENT" ? (
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                              <MessageSquare className="h-4 w-4 text-green-600" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-purple-600" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicators */}
              {otherTyping.length > 0 && (
                <div className="flex items-center space-x-2 text-gray-500">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                  </div>
                  <span className="text-xs">Someone is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message input */}
          <div className="border-t p-4 flex-shrink-0">
            {/* Closed Conversation Warning */}
            {conversation?.status === "CLOSED" && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">This conversation has been closed</p>
                  <p className="text-xs text-red-700 mt-1">
                    You cannot send messages to closed conversations. If the customer sends a new message, a new conversation will be created automatically.
                  </p>
                </div>
              </div>
            )}

            {/* Image Preview */}
            {imagePreview && conversation?.status !== "CLOSED" && (
              <div className="mb-3 relative inline-block">
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  className="max-h-32 rounded-lg border"
                />
                <button
                  onClick={removeSelectedImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            <div className="relative flex flex-col sm:flex-row items-stretch sm:items-end gap-2 w-full min-h-[48px]">
              {/* Canned Response Dropdown */}
              {showCannedDropdown && conversation?.status !== "CLOSED" && (
                <div className="absolute bottom-full mb-2 left-0 right-0 z-50 w-full">
                  <CannedResponseDropdown
                    searchQuery={cannedSearchQuery}
                    onSelect={handleCannedResponseSelect}
                    onClose={() => setShowCannedDropdown(false)}
                  />
                </div>
              )}
              
              {/* Top row: Action buttons */}
              <div className="flex items-center gap-2 sm:gap-0 sm:contents">
                {/* Image Upload Button */}
                <input
                  type="file"
                  id="image-upload"
                  accept={conversation?.platform === "INSTAGRAM" 
                    ? "image/jpeg,image/jpg,image/png,image/gif"
                    : "image/jpeg,image/jpg,image/png,image/webp,image/gif"}
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={conversation?.status === "CLOSED"}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={!isConnected || uploadingImage || conversation?.status === "CLOSED"}
                  title={conversation?.status === "CLOSED" ? "Cannot attach to closed conversation" : "Attach image"}
                  className="flex-shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                
                {/* Canned Responses Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowCannedDropdown(!showCannedDropdown);
                    setCannedSearchQuery("");
                  }}
                  disabled={!isConnected || uploadingImage || conversation?.status === "CLOSED"}
                  title={conversation?.status === "CLOSED" ? "Cannot use canned responses on closed conversation" : "Canned responses"}
                  className="flex-shrink-0"
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Textarea - grows to fill available space */}
              <Textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  conversation?.status === "CLOSED" 
                    ? "This conversation is closed. Cannot send messages." 
                    : "Type a message... (Shift+Enter for new line)"
                }
                disabled={!isConnected || uploadingImage || conversation?.status === "CLOSED"}
                className="min-h-[40px] max-h-[200px] resize-none w-full sm:flex-1"
                rows={1}
              />
              
              {/* Send Button */}
              <Button
                onClick={sendMessage}
                disabled={(!newMessage.trim() && !selectedImage) || !isConnected || uploadingImage || conversation?.status === "CLOSED"}
                size="sm"
                className="flex-shrink-0 w-full sm:w-auto"
              >
                {uploadingImage ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {!isConnected && (
              <p className="text-xs text-red-600 mt-1">
                Disconnected from real-time updates
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Customer Info Sidebar */}
      <CustomerInfoSidebar
        conversationId={conversationId}
        customerProfile={customerProfile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        notes={conversation?.notes || ""}
        tags={conversation?.tags || []}
        customerEmail={conversation?.customerEmail}
        customerPhone={conversation?.customerPhone}
        customerAddress={conversation?.customerAddress}
        onNotesUpdate={handleNotesUpdate}
        onTagsUpdate={handleTagsUpdate}
        onContactUpdate={handleContactUpdate}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={createTicketModalOpen}
        onClose={() => setCreateTicketModalOpen(false)}
        conversationId={conversationId}
        customerName={
          customerProfile
            ? `${customerProfile.firstName || ""} ${
                customerProfile.lastName || ""
              }`.trim()
            : conversation?.customerName
        }
        customerEmail={conversation?.customerEmail || undefined}
        existingTickets={conversation?.freshdeskTickets || []}
        onTicketCreated={(ticketData) => {
          // Update conversation state with ticket info
          setConversation((prev) =>
            prev
              ? {
                  ...prev,
                  freshdeskTickets: ticketData.conversation.freshdeskTickets,
                }
              : null
          );

          // Close modal after successful creation
          setTimeout(() => setCreateTicketModalOpen(false), 2000);
        }}
      />

      {/* Image Validation Error Dialog */}
      <AlertDialog open={!!imageValidationError} onOpenChange={() => setImageValidationError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Invalid Image Format</AlertDialogTitle>
            <AlertDialogDescription>
              {imageValidationError}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setImageValidationError(null)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Close Chat Confirmation Dialog */}
      <AlertDialog open={showCloseConfirmDialog} onOpenChange={setShowCloseConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the conversation as closed. If the customer sends another message, a new conversation will be created automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCloseConfirmDialog(false)}
              disabled={closingChat}
            >
              Cancel
            </Button>
            <AlertDialogAction
              onClick={handleCloseChat}
              disabled={closingChat}
              className="bg-red-600 hover:bg-red-700"
            >
              {closingChat ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Close Chat
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

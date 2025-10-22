import { Queue, Worker, Job } from "bullmq";
import { db } from "./db";
import { llmService } from "./llm/service";
import { decrypt } from "./encryption";
import { Provider } from "@prisma/client";
import { socketService } from "./socket";
import { getOrCreateInstagramConversation, getInstagramUserProfile } from "./instagram-conversation-helper";
import { facebookAPI } from "./facebook";
import { RAGChatbot } from "./rag-chatbot";

// Lazy initialization to avoid Redis connection on module load
let redis: any = null;
let incomingMessageQueueInstance: Queue | null = null;
let botReplyQueueInstance: Queue | null = null;
let outgoingMessageQueueInstance: Queue | null = null;
let workersInitialized = false;

// Helper function to initialize Redis connection
async function getRedis() {
  if (!redis) {
    try {
      const Redis = (await import("ioredis")).default;
      redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
        maxRetriesPerRequest: null, // Required for BullMQ
        lazyConnect: true,
        enableReadyCheck: false,
      });

      redis.on("error", (error: any) => {
        console.error("Redis connection error:", error);
      });

      redis.on("connect", () => {
        console.log("Connected to Redis");
      });

      // Test connection
      await redis.ping();
    } catch (error) {
      console.error("Failed to initialize Redis:", error);
      throw new Error("Redis connection failed");
    }
  }
  return redis;
}

// Lazy queue getters
export async function getIncomingMessageQueue(): Promise<Queue> {
  if (!incomingMessageQueueInstance) {
    const redisConnection = await getRedis();
    incomingMessageQueueInstance = new Queue("incoming-message", {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    // Auto-initialize workers when queue is first accessed
    if (!workersInitialized) {
      console.log("Auto-initializing queue workers...");
      await initializeWorkers();
      workersInitialized = true;
    }
  }
  return incomingMessageQueueInstance;
}

export async function getBotReplyQueue(): Promise<Queue> {
  if (!botReplyQueueInstance) {
    const redisConnection = await getRedis();
    botReplyQueueInstance = new Queue("bot-reply", {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return botReplyQueueInstance;
}

export async function getOutgoingMessageQueue(): Promise<Queue> {
  if (!outgoingMessageQueueInstance) {
    const redisConnection = await getRedis();
    outgoingMessageQueueInstance = new Queue("outgoing-message", {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });
  }
  return outgoingMessageQueueInstance;
}

// For backward compatibility - these will be null if Redis is not available
export const incomingMessageQueue = null;
export const botReplyQueue = null;
export const outgoingMessageQueue = null;

// Job data types
export interface IncomingMessageJobData {
  pageId: string;
  senderId: string;
  messageText: string;
  timestamp: number;
}

export interface BotReplyJobData {
  conversationId: string;
  triggerMessageId: string;
}

export interface OutgoingMessageJobData {
  pageId: string;
  recipientId: string;
  messageText: string;
  messageId: string;
}

export interface InstagramMessageJobData {
  instagramUserId: string;
  senderId: string;
  messageText: string;
  timestamp: number;
  messageId: string;
  companyId: string;
}

// Worker initialization - also lazy
let incomingMessageWorkerInstance: Worker | null = null;
let botReplyWorkerInstance: Worker | null = null;
let outgoingMessageWorkerInstance: Worker | null = null;

export async function initializeWorkers() {
  if (workersInitialized) {
    console.log("Workers already initialized, skipping...");
    return;
  }

  try {
    const redisConnection = await getRedis();

    // Test Redis connection first
    try {
      await redisConnection.ping();
      console.log("Redis connection successful");
    } catch (error) {
      console.error("Redis connection failed:", error);
      throw new Error(
        `Redis connection failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    if (!incomingMessageWorkerInstance) {
      incomingMessageWorkerInstance = new Worker(
        "incoming-message",
        async (job: Job<IncomingMessageJobData | InstagramMessageJobData>) => {
          try {
            console.log(`Processing job: ${job.name} with data:`, job.data);
            
            // Handle Instagram messages
            if (job.name === "process-instagram-message") {
              const instagramData = job.data as InstagramMessageJobData;
              await processInstagramMessageDirect(instagramData);
              return { success: true, type: "instagram" };
            }
            
            // Handle Facebook messages (existing logic)
            const { pageId, senderId, messageText, timestamp } = job.data as IncomingMessageJobData;

            console.log(
              `Processing Facebook message for pageId: ${pageId}, senderId: ${senderId}`
            );

            // Find page connection by Facebook pageId
            const pageConnection = await db.pageConnection.findUnique({
              where: { pageId },
            });

            if (!pageConnection) {
              console.error(
                `Page connection not found for Facebook pageId: ${pageId}`
              );
              throw new Error(
                `Page connection not found for Facebook pageId: ${pageId}`
              );
            }

            console.log(`Page connection found:`, {
              dbId: pageConnection.id,
              facebookPageId: pageConnection.pageId,
              pageName: pageConnection.pageName,
            });

            // Find or create conversation using the database ID, not Facebook pageId
            let conversation = await db.conversation.findUnique({
              where: {
                pageConnectionId_psid: {
                  pageConnectionId: pageConnection.id, // Use database ID, not Facebook pageId
                  psid: senderId,
                },
              },
            });

            if (!conversation) {
              console.log(
                `Creating new conversation for database pageId: ${pageConnection.id}, senderId: ${senderId}`
              );

              // Fetch customer profile from Facebook before creating conversation
              let customerProfile = null;
              try {
                console.log(`Fetching customer profile for ${senderId}...`);
                const pageAccessToken = await decrypt(
                  pageConnection.pageAccessTokenEnc
                );
                const profile = await facebookAPI.getUserProfile(
                  senderId,
                  pageAccessToken,
                  ["first_name", "last_name", "profile_pic", "locale"]
                );

                customerProfile = {
                  firstName: profile.first_name || "Unknown",
                  lastName: profile.last_name || "",
                  fullName: `${profile.first_name || "Unknown"} ${
                    profile.last_name || ""
                  }`.trim(),
                  profilePicture: profile.profile_pic || null,
                  locale: profile.locale || "en_US",
                  facebookUrl: `https://www.facebook.com/${senderId}`,
                  cached: true,
                  cachedAt: new Date().toISOString(),
                };
                console.log(`Customer profile fetched:`, customerProfile);
              } catch (profileError) {
                console.error(
                  `Failed to fetch customer profile for ${senderId}:`,
                  profileError
                );
                // Continue with conversation creation even if profile fetch fails
              }

              conversation = await db.conversation.create({
                data: {
                  pageConnectionId: pageConnection.id,
                  psid: senderId,
                  platform: 'FACEBOOK',
                  status: "OPEN",
                  autoBot: pageConnection.autoBot, // Use page's autoBot setting
                  lastMessageAt: new Date(),
                  tags: [],
                  meta: customerProfile ? { customerProfile, platform: "facebook" } : { platform: "facebook" },
                },
              });
              console.log(
                `Conversation created with ID: ${conversation.id}, autoBot: ${pageConnection.autoBot} (from page setting)`
              );
              console.log(
                `Conversation created with ID: ${conversation.id}`
              );

              // Emit new conversation event to company room
              try {
                socketService.emitToCompany(
                  pageConnection.companyId,
                  "conversation:new",
                  {
                    conversation: {
                      id: conversation.id,
                      psid: conversation.psid,
                      status: conversation.status,
                      autoBot: conversation.autoBot,
                      customerName:
                        customerProfile?.fullName ||
                        `Customer ${senderId.slice(-4)}`,
                      customerProfile: customerProfile,
                      lastMessageAt: conversation.lastMessageAt,
                      messageCount: 0,
                      unreadCount: 1,
                    },
                  }
                );
                console.log(
                  `Emitted conversation:new event for conversation ${conversation.id} to company ${pageConnection.companyId}`
                );

                // Also emit to development company room
                if (process.env.NODE_ENV === "development") {
                  socketService.emitToCompany(
                    "dev-company",
                    "conversation:new",
                    {
                      conversation: {
                        id: conversation.id,
                        psid: conversation.psid,
                        status: conversation.status,
                        autoBot: conversation.autoBot,
                        customerName:
                          customerProfile?.fullName ||
                          `Customer ${senderId.slice(-4)}`,
                        customerProfile: customerProfile,
                        lastMessageAt: conversation.lastMessageAt,
                        messageCount: 0,
                        unreadCount: 1,
                      },
                    }
                  );
                  console.log(
                    `Emitted conversation:new event to dev-company room`
                  );
                }
              } catch (emitError) {
                console.error(
                  "Failed to emit conversation:new event:",
                  emitError
                );
              }
            } else {
              console.log(
                `Existing conversation found with ID: ${conversation.id}`
              );
            }

            // Check for duplicate messages (race condition protection)
            const existingMessage = await db.message.findFirst({
              where: {
                conversationId: conversation.id,
                role: "USER",
                text: messageText,
                meta: {
                  path: ["timestamp"],
                  equals: timestamp,
                },
              },
            });

            let message;
            if (existingMessage) {
              console.log(
                `Duplicate user message detected, using existing message ID: ${existingMessage.id}`
              );
              message = existingMessage;
            } else {
              // Create message
              message = await db.message.create({
                data: {
                  conversationId: conversation.id,
                  role: "USER",
                  text: messageText,
                  meta: {
                    timestamp,
                    receivedAt: new Date().toISOString(),
                    source: "facebook-queue-worker",
                  },
                },
              });
            }

            // Update conversation last message time
            await db.conversation.update({
              where: { id: conversation.id },
              data: { lastMessageAt: new Date() },
            });

            // Emit real-time event for new message
            try {
              const fullMessage = await db.message.findUnique({
                where: { id: message.id },
                include: {
                  conversation: {
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
                  },
                },
              });

              if (fullMessage) {
                // Emit to conversation room
                const messageEvent = {
                  message: {
                    id: fullMessage.id,
                    text: fullMessage.text,
                    role: fullMessage.role,
                    createdAt: fullMessage.createdAt.toISOString(),
                    meta: fullMessage.meta,
                  },
                  conversation: {
                    id: conversation.id,
                    psid: conversation.psid,
                    status: conversation.status,
                    autoBot: conversation.autoBot,
                  },
                };

                console.log(
                  `Emitting message:new to conversation:${conversation.id}`,
                  messageEvent
                );
                socketService.emitToConversation(
                  conversation.id,
                  "message:new",
                  messageEvent
                );

                // Emit to company room for dashboard updates
                const messageCount = await db.message.count({
                  where: { conversationId: conversation.id },
                });

                // Emit conversation:updated for statistics
                const companyId = fullMessage.conversation.pageConnection?.company.id || 
                                fullMessage.conversation.instagramConnection?.company.id;
                if (companyId) {
                  socketService.emitToCompany(
                    companyId,
                    "conversation:updated",
                    {
                      conversationId: conversation.id,
                      lastMessageAt: new Date().toISOString(),
                      messageCount: messageCount,
                    }
                  );
                }

                // Emit message:new for conversation list updates with last message preview
                if (companyId) {
                  socketService.emitToCompany(
                    companyId,
                    "message:new",
                    messageEvent
                  );
                }

                // Also emit to development company room
                if (process.env.NODE_ENV === "development") {
                  socketService.emitToCompany(
                    "dev-company",
                    "conversation:updated",
                    {
                      conversationId: conversation.id,
                      lastMessageAt: new Date().toISOString(),
                      messageCount: messageCount,
                    }
                  );

                  // Emit message:new for conversation list updates in dev mode
                  socketService.emitToCompany(
                    "dev-company",
                    "message:new",
                    messageEvent
                  );
                }
              }
            } catch (socketError) {
              console.error("Failed to emit real-time events:", socketError);
              // Don't throw - continue processing even if real-time fails
            }

            // If auto bot is enabled, queue bot reply
            if (conversation.autoBot) {
              const botQueue = await getBotReplyQueue();
              await botQueue.add("generate-reply", {
                conversationId: conversation.id,
                triggerMessageId: message.id,
              });
            }

            return { messageId: message.id, conversationId: conversation.id };
          } catch (error) {
            console.error("Error processing incoming message:", error);
            throw error;
          }
        },
        { connection: redisConnection }
      );
    }

    // Initialize bot reply worker
    if (!botReplyWorkerInstance) {
      botReplyWorkerInstance = new Worker(
        "bot-reply",
        async (job: Job<BotReplyJobData>) => {
          console.log(
            `Bot-reply worker started for conversation: ${job.data.conversationId}`
          );
          const { conversationId } = job.data;

          try {
            // Get conversation with related data
            const conversation = await db.conversation.findUnique({
              where: { id: conversationId },
              include: {
                messages: {
                  orderBy: { createdAt: 'desc' },
                  take: 50 // Limit message history for performance
                },
                pageConnection: {
                  include: {
                    company: {
                      include: {
                        providerConfig: true
                      }
                    }
                  }
                },
                instagramConnection: {
                  include: {
                    company: {
                      include: {
                        providerConfig: true
                      }
                    }
                  }
                }
              },
            });

            if (!conversation) {
              throw new Error("Conversation or provider config not found");
            }

            const company = conversation.pageConnection?.company || conversation.instagramConnection?.company;
            if (!company) {
              throw new Error("Company not found for conversation");
            }

            const providerConfig = company.providerConfig;

            // Prepare message history for LLM
            const messageHistory = [...conversation.messages]
              .reverse()
              .map((msg) => ({
                role:
                  msg.role === "USER"
                    ? ("user" as const)
                    : ("assistant" as const),
                content: msg.text,
              }))
              .filter((msg) => msg.role === "user" || msg.role === "assistant");

            // Check if provider config is properly configured
            if (!providerConfig) {
              throw new Error("LLM provider config not found");
            }
            if (!providerConfig.apiKeyEnc) {
              throw new Error("LLM provider API key not configured");
            }

            // Decrypt API key
            const apiKey = await decrypt(providerConfig.apiKeyEnc);
            if (!apiKey) {
              throw new Error("Failed to decrypt API key");
            }

            console.log(
              `Generating bot response with provider: ${providerConfig.provider}, model: ${providerConfig.model}`
            );
            console.log(
              `Provider type:`,
              typeof providerConfig.provider,
              `Value:`,
              providerConfig.provider
            );

            // Use the Prisma Provider enum directly
            console.log(`Using provider from DB:`, providerConfig.provider);

            // Validate that it's a valid provider
            if (!Object.values(Provider).includes(providerConfig.provider)) {
              throw new Error(
                `Invalid provider: ${
                  providerConfig.provider
                }. Available: ${Object.values(Provider).join(", ")}`
              );
            }

            console.log(`Validated provider:`, providerConfig.provider);

            // Get the latest user message for RAG search
            const latestUserMessage = messageHistory
              .filter((msg) => msg.role === "user")
              .pop();

            console.log(
              `Debug: messageHistory length: ${messageHistory.length}`
            );
            console.log(
              `Debug: latestUserMessage found: ${!!latestUserMessage}`
            );
            if (latestUserMessage) {
              console.log(
                `Debug: latestUserMessage content: "${latestUserMessage.content}"`
              );
            }

            let response;

            if (latestUserMessage) {
              console.log(
                `Using Playground RAG API for Facebook bot response to: "${latestUserMessage.content}"`
              );

              try {
                // Use the same API endpoint as the Playground for consistency
                const ragApiResponse = await fetch(
                  `${
                    process.env.NEXTAUTH_URL || "http://localhost:3001"
                  }/api/rag/chat`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      message: latestUserMessage.content,
                      conversationId: conversation.id, // Add conversation ID for memory!
                      companyId: company.id,
                      internal: true, // Mark as internal call
                      settings: {
                        temperature: Math.min(providerConfig.temperature, 0.2), // Cap temperature for Facebook
                        maxTokens: providerConfig.maxTokens,
                        searchLimit: 3, // Fewer chunks for cleaner responses
                        similarityThreshold: 0.1, // Lower threshold for better recall
                        systemPrompt: providerConfig.systemPrompt, // Use custom system prompt from LLM Config
                      },
                    }),
                  }
                );

                if (ragApiResponse.ok) {
                  const ragData = await ragApiResponse.json();

                  // Use RAG response
                  response = {
                    text: ragData.message,
                    usage: ragData.usage,
                  };

                  console.log(
                    `Facebook RAG API Response: Generated ${ragData.message.length} chars with ${ragData.context?.relevantChunks || 0} relevant chunks`
                  );

                  // Log source documents for Facebook
                  if (ragData.context?.sourceDocuments?.length > 0) {
                    console.log(
                      `Facebook Sources: ${ragData.context.sourceDocuments.join(
                        ", "
                      )}`
                    );
                  }
                } else {
                  throw new Error(
                    `RAG API failed with status: ${ragApiResponse.status}`
                  );
                }
              } catch (ragError) {
                console.error(
                  "RAG API failed, falling back to standard LLM:",
                  ragError
                );

                // Fallback to standard LLM response
                response = await llmService.generateResponse(
                  {
                    provider: providerConfig.provider as Provider,
                    apiKey: apiKey,
                    model: providerConfig.model,
                    temperature: providerConfig.temperature,
                    maxTokens: providerConfig.maxTokens,
                    systemPrompt: providerConfig.systemPrompt,
                  },
                  messageHistory
                );
              }
            } else {
              // No user message found, use standard response
              response = await llmService.generateResponse(
                {
                  provider: providerConfig.provider as Provider,
                  apiKey: apiKey,
                  model: providerConfig.model,
                  temperature: providerConfig.temperature,
                  maxTokens: providerConfig.maxTokens,
                  systemPrompt: providerConfig.systemPrompt,
                },
                messageHistory
              );
            }

            // Check for duplicate bot messages (race condition protection)
            const existingBotMessage = await db.message.findFirst({
              where: {
                conversationId: conversation.id,
                role: "BOT",
                text: response.text,
                providerUsed: providerConfig.provider,
              },
              orderBy: { createdAt: "desc" },
            });

            let botMessage;
            if (
              existingBotMessage &&
              Math.abs(
                new Date().getTime() - existingBotMessage.createdAt.getTime()
              ) < 5000
            ) {
              // Within 5 seconds
              console.log(
                `Duplicate bot message detected, using existing message ID: ${existingBotMessage.id}`
              );
              botMessage = existingBotMessage;
            } else {
              // Create bot message
              botMessage = await db.message.create({
                data: {
                  conversationId: conversation.id,
                  role: "BOT",
                  text: response.text,
                  providerUsed: providerConfig.provider,
                  meta: {
                    usage: response.usage,
                    model: response.model,
                    generatedVia: "facebook-queue-worker",
                    ragEnabled: !!latestUserMessage, // Track if RAG was used
                  },
                },
              });
            }

            // Emit real-time event for bot message
            try {
              const botMessageEvent = {
                message: {
                  id: botMessage.id,
                  text: botMessage.text,
                  role: botMessage.role,
                  createdAt: botMessage.createdAt.toISOString(),
                  meta: botMessage.meta,
                },
                conversation: {
                  id: conversation.id,
                  psid: conversation.psid,
                  status: conversation.status,
                  autoBot: conversation.autoBot,
                },
              };

              console.log(
                `Emitting bot message:new to conversation:${conversationId}`,
                botMessageEvent
              );

              // Emit to conversation room for active viewers
              socketService.emitToConversation(
                conversationId,
                "message:new",
                botMessageEvent
              );

              // Emit to company room for conversation list updates
              socketService.emitToCompany(
                company.id,
                "message:new",
                botMessageEvent
              );

              // Emit conversation:view-update for real-time UI updates (for ConversationsList)
              socketService.emitToCompany(
                company.id,
                "conversation:view-update",
                {
                  conversationId: conversation.id,
                  type: "new_message",
                  message: {
                    text: botMessage.text,
                    role: botMessage.role,
                    createdAt: botMessage.createdAt.toISOString(),
                  },
                  lastMessageAt: new Date().toISOString(),
                  autoBot: conversation.autoBot,
                  timestamp: new Date().toISOString(),
                }
              );
            } catch (socketError) {
              console.error(
                "Failed to emit bot message real-time event:",
                socketError
              );
            }

            // Queue outgoing message to Facebook
            const outgoingQueue = await getOutgoingMessageQueue();
            await outgoingQueue.add("send-message", {
              pageId: conversation.pageConnection?.pageId, // Use Facebook page ID, not database ID
              recipientId: conversation.psid,
              messageText: response.text,
              messageId: botMessage.id,
            });

            console.log(
              `Queued bot response to Facebook page ${conversation.pageConnection?.pageId}, recipient ${conversation.psid}`
            );

            return { messageId: botMessage.id };
          } catch (error) {
            console.error("Error generating bot reply:", error);
            throw error;
          }
        },
        { connection: redisConnection }
      );
    }

    // Initialize outgoing message worker
    if (!outgoingMessageWorkerInstance) {
      outgoingMessageWorkerInstance = new Worker(
        "outgoing-message",
        async (job: Job<OutgoingMessageJobData>) => {
          const { pageId, recipientId, messageText, messageId } = job.data;

          try {
            // Get conversation with platform information
            const msg = await db.message.findUnique({
              where: { id: messageId },
              include: { 
                conversation: {
                  include: {
                    instagramConnection: true,
                    pageConnection: true
                  }
                }
              },
            });

            if (!msg || !msg.conversation) {
              throw new Error('Message or conversation not found');
            }

            const conversation = msg.conversation;
            const platform = conversation.platform.toLowerCase() as 'facebook' | 'instagram';
            
            console.log(`📤 Outgoing message worker: Platform detected as ${platform} for conversation ${conversation.id}`);

            if (platform === 'instagram') {
              console.log(`📱 Processing Instagram message to ${recipientId}`);

              // Get Instagram connection details
              const instagramConnection = conversation.instagramConnection;
              if (!instagramConnection) {
                throw new Error('Instagram connection not found for Instagram conversation');
              }

              // Get Instagram credentials from connection
              const instagramUserId = instagramConnection.instagramUserId;
              const accessToken = await decrypt(instagramConnection.accessTokenEnc);
              
              console.log(`🔑 Using Instagram connection: ${instagramConnection.username} (${instagramUserId})`);

              if (!instagramUserId || !accessToken) {
                throw new Error('Instagram credentials not found - missing userId or access token');
              }

              // Send message via Instagram Graph API (like in the repository example)
              console.log(`🚀 Sending Instagram message to ${recipientId} using Instagram Graph API`);
              const igResponse = await fetch(`https://graph.instagram.com/v22.0/me/messages`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${accessToken}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  recipient: { id: recipientId },
                  message: { text: messageText },
                }),
              });

              if (!igResponse.ok) {
                const errorText = await igResponse.text();
                throw new Error(`Instagram API error: ${errorText}`);
              }

              const igResult = await igResponse.json();

              // Update message with IG delivery status
              console.log(`✅ Instagram message sent successfully: ${igResult.message_id}`);
              await db.message.update({
                where: { id: messageId },
                data: {
                  meta: {
                    ...((msg.meta as any) || {}),
                    instagramMessageId: igResult.message_id,
                    sentAt: new Date().toISOString(),
                    platform: 'instagram',
                    sent: true,
                  },
                },
              });

              // Emit delivery confirmation
              try {
                const message = await db.message.findUnique({
                  where: { id: messageId },
                  include: { conversation: true },
                });
                if (message) {
                  socketService.emitToConversation(message.conversationId, 'message:sent', {
                    messageId,
                    instagramMessageId: igResult.message_id,
                    sentAt: new Date().toISOString(),
                  });
                }
              } catch (socketError) {
                console.error('Failed to emit IG delivery confirmation:', socketError);
              }

              return { instagramMessageId: igResult.message_id };
            }

            // Default: Facebook Messenger path
            // Get page access token
            console.log(`Looking up page connection for Facebook page ID: ${pageId}`);
            const page = await db.pageConnection.findUnique({ where: { pageId } });

            console.log(`Page connection found:`, !!page);

            if (!page) {
              throw new Error('Page connection not found');
            }

            const accessToken = await decrypt(page.pageAccessTokenEnc);

            // Send message via Facebook API
            console.log(`🚀 Sending Facebook message to ${recipientId} via page ${pageId}`);
            const response = await fetch(`https://graph.facebook.com/v18.0/me/messages?access_token=${accessToken}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                recipient: { id: recipientId },
                message: { text: messageText },
              }),
            });

            if (!response.ok) {
              const error = await response.text();
              throw new Error(`Facebook API error: ${error}`);
            }

            const result = await response.json();

            // Update message with delivery status
            await db.message.update({
              where: { id: messageId },
              data: {
                meta: {
                  facebookMessageId: result.message_id,
                  sentAt: new Date().toISOString(),
                },
              },
            });

            // Emit delivery confirmation
            try {
              const message = await db.message.findUnique({
                where: { id: messageId },
                include: {
                  conversation: true,
                },
              });

              if (message) {
                socketService.emitToConversation(
                  message.conversationId,
                  'message:sent',
                  {
                    messageId: messageId,
                    facebookMessageId: result.message_id,
                    sentAt: new Date().toISOString(),
                  }
                );
              }
            } catch (socketError) {
              console.error(
                'Failed to emit delivery confirmation:',
                socketError
              );
            }

            return { facebookMessageId: result.message_id };
          } catch (error) {
            console.error('Error sending outgoing message:', error);
            throw error;
          }
        },
        { connection: redisConnection }
      );
    }

    workersInitialized = true;
    console.log("Workers initialized successfully");
  } catch (error) {
    console.error("Failed to initialize workers:", error);
  }
}

// Direct message processing function (fallback when Redis is unavailable)
export async function processIncomingMessageDirect(
  data: IncomingMessageJobData
) {
  const { pageId, senderId, messageText, timestamp } = data;

  try {
    console.log(
      `Processing message directly for pageId: ${pageId}, senderId: ${senderId}`
    );

    // Find page connection by Facebook pageId
    const pageConnection = await db.pageConnection.findUnique({
      where: { pageId },
    });

    if (!pageConnection) {
      console.error(
        `Page connection not found for Facebook pageId: ${pageId}`
      );
      throw new Error(
        `Page connection not found for Facebook pageId: ${pageId}`
      );
    }

    console.log(`Page connection found:`, {
      dbId: pageConnection.id,
      facebookPageId: pageConnection.pageId,
      pageName: pageConnection.pageName,
    });

    // Find or create conversation using the database ID, not Facebook pageId
    let conversation = await db.conversation.findUnique({
      where: {
        pageConnectionId_psid: {
          pageConnectionId: pageConnection.id, // Use database ID, not Facebook pageId
          psid: senderId,
        },
      },
    });

    if (!conversation) {
      console.log(
        `Creating new conversation for database pageId: ${pageConnection.id}, senderId: ${senderId}`
      );

      // Fetch customer profile from Facebook before creating conversation
      let customerProfile = null;
      try {
        console.log(`Fetching customer profile for ${senderId}...`);
        const pageAccessToken = await decrypt(
          pageConnection.pageAccessTokenEnc
        );
        const profile = await facebookAPI.getUserProfile(
          senderId,
          pageAccessToken,
          ["first_name", "last_name", "profile_pic", "locale"]
        );

        customerProfile = {
          firstName: profile.first_name || "Unknown",
          lastName: profile.last_name || "",
          fullName: `${profile.first_name || "Unknown"} ${
            profile.last_name || ""
          }`.trim(),
          profilePicture: profile.profile_pic || null,
          locale: profile.locale || "en_US",
          facebookUrl: `https://www.facebook.com/${senderId}`,
          cached: true,
          cachedAt: new Date().toISOString(),
        };
        console.log(`Customer profile fetched:`, customerProfile);
      } catch (profileError) {
        console.error(
          `Failed to fetch customer profile for ${senderId}:`,
          profileError
        );
        // Continue with conversation creation even if profile fetch fails
      }

      conversation = await db.conversation.create({
        data: {
          pageConnectionId: pageConnection.id, // Use database ID, not Facebook pageId
          psid: senderId,
          platform: 'FACEBOOK',
          status: "OPEN",
          autoBot: pageConnection.autoBot, // Use page's autoBot setting
          lastMessageAt: new Date(),
          tags: [],
          meta: customerProfile ? { customerProfile, platform: "facebook" } : { platform: "facebook" },
        },
      });
      console.log(
        `Conversation created with ID: ${conversation.id}, autoBot: ${pageConnection.autoBot} (from page setting)`
      );
      console.log(`Conversation created with ID: ${conversation.id}`);

      // Emit new conversation event to company room
      try {
        socketService.emitToCompany(
          pageConnection.companyId,
          "conversation:new",
          {
            conversation: {
              id: conversation.id,
              psid: conversation.psid,
              status: conversation.status,
              autoBot: conversation.autoBot,
              customerName:
                customerProfile?.fullName || `Customer ${senderId.slice(-4)}`,
              customerProfile: customerProfile,
              lastMessageAt: conversation.lastMessageAt,
              messageCount: 0,
              unreadCount: 1,
            },
          }
        );
        console.log(
          `Emitted conversation:new event for conversation ${conversation.id} to company ${pageConnection.companyId}`
        );

        // Also emit to development company room
        if (process.env.NODE_ENV === "development") {
          socketService.emitToCompany("dev-company", "conversation:new", {
            conversation: {
              id: conversation.id,
              psid: conversation.psid,
              status: conversation.status,
              autoBot: conversation.autoBot,
              customerName:
                customerProfile?.fullName || `Customer ${senderId.slice(-4)}`,
              customerProfile: customerProfile,
              lastMessageAt: conversation.lastMessageAt,
              messageCount: 0,
              unreadCount: 1,
            },
          });
          console.log(`Emitted conversation:new event to dev-company room`);
        }
      } catch (emitError) {
        console.error("Failed to emit conversation:new event:", emitError);
      }
    } else {
      console.log(`Existing conversation found with ID: ${conversation.id}`);
    }

    // Create message record
    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        text: messageText,
        role: "USER",
        meta: {
          facebookMessageId: `fb_${timestamp}`,
          timestamp: timestamp,
          source: "facebook_webhook",
        },
      },
    });

    console.log(`Message saved with ID: ${message.id}`);

    // Update conversation lastMessageAt
    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // Emit real-time event for new message
    try {
      const fullMessage = await db.message.findUnique({
        where: { id: message.id },
        include: {
          conversation: {
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
          },
        },
      });

      if (fullMessage) {
        // Emit to conversation room
        const messageEvent = {
          message: {
            id: fullMessage.id,
            text: fullMessage.text,
            role: fullMessage.role,
            createdAt: fullMessage.createdAt.toISOString(),
            meta: fullMessage.meta,
          },
          conversation: {
            id: conversation.id,
            psid: conversation.psid,
            status: conversation.status,
            autoBot: conversation.autoBot,
          },
        };

        console.log(
          `Emitting message:new to conversation:${conversation.id}`,
          messageEvent
        );
        socketService.emitToConversation(
          conversation.id,
          "message:new",
          messageEvent
        );

        // Emit to company room for dashboard updates
        const messageCount = await db.message.count({
          where: { conversationId: conversation.id },
        });

        // Get company ID from either pageConnection or instagramConnection
        const companyId = fullMessage.conversation.pageConnection?.company.id || 
                        fullMessage.conversation.instagramConnection?.company.id;

        // Emit conversation:view-update for real-time UI updates (for ConversationsList)
        if (companyId) {
          socketService.emitToCompany(
            companyId,
            "conversation:view-update",
          {
            conversationId: conversation.id,
            type: "new_message",
            message: {
              text: fullMessage.text,
              role: fullMessage.role,
              createdAt: fullMessage.createdAt.toISOString(),
            },
            lastMessageAt: new Date().toISOString(),
            timestamp: new Date().toISOString(),
          }
        );

        // Also emit the original conversation:updated for statistics
        socketService.emitToCompany(
          companyId,
          "conversation:updated",
          {
            conversationId: conversation.id,
            lastMessageAt: new Date().toISOString(),
            messageCount: messageCount,
          }
        );
        }

        // Emit message:new for conversation list updates with last message preview
        if (companyId) {
          socketService.emitToCompany(
            companyId,
            "message:new",
            messageEvent
          );
        }

        // Also emit to development company room
        if (process.env.NODE_ENV === "development") {
          socketService.emitToCompany("dev-company", "conversation:updated", {
            conversationId: conversation.id,
            lastMessageAt: new Date().toISOString(),
            messageCount: messageCount,
          });

          socketService.emitToCompany(
            "dev-company",
            "message:new",
            messageEvent
          );
        }
      }
    } catch (emitError) {
      console.error("Failed to emit real-time events:", emitError);
    }

    // Handle auto-bot response if enabled
    if (conversation.autoBot) {
      console.log(`Auto-bot enabled for conversation ${conversation.id}`);
      try {
        // Generate bot response using RAG
        const botResponse = await RAGChatbot.generateResponse(
          messageText,
          pageConnection.companyId,
          conversation.id
        );

        if (botResponse.response) {
          // Save bot response to database
          const botMessage = await db.message.create({
            data: {
              conversationId: conversation.id,
              text: botResponse.response,
              role: "BOT",
              meta: {
                ragContext: JSON.parse(JSON.stringify(botResponse.context)),
                ragUsage: botResponse.usage,
                ragMemory: JSON.parse(JSON.stringify(botResponse.memory)),
                timestamp: Date.now(),
                source: "auto_bot",
              },
            },
          });

          console.log(`Bot message saved with ID: ${botMessage.id}`);

          // Send bot response via Facebook API
          const pageAccessToken = await decrypt(
            pageConnection.pageAccessTokenEnc
          );
          await facebookAPI.sendMessage(pageAccessToken, {
            recipient: { id: senderId },
            message: { text: botResponse.response },
          });

          // Emit bot message to conversation room
          const botMessageEvent = {
            message: {
              id: botMessage.id,
              text: botMessage.text,
              role: botMessage.role,
              createdAt: botMessage.createdAt.toISOString(),
              meta: botMessage.meta,
            },
            conversation: {
              id: conversation.id,
              psid: conversation.psid,
              status: conversation.status,
              autoBot: conversation.autoBot,
            },
          };

          socketService.emitToConversation(
            conversation.id,
            "message:new",
            botMessageEvent
          );

          // Emit to company room
          socketService.emitToCompany(
            pageConnection.companyId,
            "message:new",
            botMessageEvent
          );

          // Emit conversation:view-update for real-time UI updates (for ConversationsList)
          socketService.emitToCompany(
            pageConnection.companyId,
            "conversation:view-update",
            {
              conversationId: conversation.id,
              type: "new_message",
              message: {
                text: botMessage.text,
                role: botMessage.role,
                createdAt: botMessage.createdAt.toISOString(),
              },
              lastMessageAt: new Date().toISOString(),
              autoBot: conversation.autoBot,
              timestamp: new Date().toISOString(),
            }
          );

          console.log(`Bot response sent and emitted`);
        }
      } catch (botError) {
        console.error("Auto-bot response failed:", botError);
      }
    }

    console.log(`Message processing completed for ${senderId}`);
  } catch (error) {
    console.error("Message processing failed:", error);
    throw error;
  }
}

// Instagram message processing function (similar to Facebook)
export async function processInstagramMessageDirect(data: {
  instagramUserId: string;
  senderId: string;
  messageText: string;
  timestamp: number;
  messageId: string;
  companyId: string;
}) {
  const { instagramUserId, senderId, messageText, timestamp, messageId, companyId } = data;

  try {
    console.log(
      `Processing Instagram message directly for instagramUserId: ${instagramUserId}, senderId: ${senderId}`
    );

    const instagramConnection = await db.instagramConnection.findFirst({
      where: { 
        instagramUserId,
        companyId,
        isActive: true,
      },
      include: { company: true },
    });

    if (!instagramConnection) {
      throw new Error(`Instagram connection not found for instagramUserId: ${instagramUserId}`);
    }

    // Use the helper function to get or create conversation (prevents duplicates)
    console.log(`🔍 Using conversation helper to find/create conversation for sender ${senderId}`);
    const conversation = await getOrCreateInstagramConversation(
      instagramConnection.id,
      senderId
    );

    // This should not happen now since we restored conversation creation
    if (!conversation) {
      console.log(`⚠️ No conversation found or created for sender ${senderId}`);
      return;
    }

    // Check if this is a newly created conversation to emit the new conversation event
    const messageCount = await db.message.count({
      where: { conversationId: conversation.id },
    });

    // If no messages exist, this is a new conversation
    if (messageCount === 0) {
      console.log(`🆕 New Instagram conversation detected, emitting conversation:new event`);
      
      // Try to get enhanced user profile from Instagram API
      let customerProfile;
      try {
        const accessToken = await decrypt(instagramConnection.accessTokenEnc);
        customerProfile = await getInstagramUserProfile(senderId, accessToken);
      } catch (profileError) {
        console.warn('⚠️ Failed to get Instagram user profile, using fallback:', profileError);
        customerProfile = {
          firstName: `Instagram User`,
          lastName: `${senderId.slice(-4)}`,
          fullName: `Instagram User ${senderId.slice(-4)}`,
          profilePicture: null,
          instagramUrl: `https://www.instagram.com/direct/t/${senderId}`,
          platform: "instagram",
          cached: false,
          cachedAt: new Date().toISOString(),
        };
      }

      // Update conversation with enhanced profile
      await db.conversation.update({
        where: { id: conversation.id },
        data: {
          meta: { customerProfile, platform: "instagram" },
        },
      });

      // Emit new conversation event
      socketService.emitToCompany(
        instagramConnection.companyId,
        "conversation:new",
        {
          conversation: {
            id: conversation.id,
            psid: conversation.psid,
            status: conversation.status,
            autoBot: conversation.autoBot,
            customerName: customerProfile.fullName,
            customerProfile: customerProfile,
            lastMessageAt: conversation.lastMessageAt,
            messageCount: 0,
            unreadCount: 1,
            platform: "INSTAGRAM",
            pageName: `@${instagramConnection.username}`,
          },
        }
      );
    }

    const message = await db.message.create({
      data: {
        conversationId: conversation.id,
        text: messageText,
        role: "USER",
        meta: {
          instagramMessageId: messageId,
          timestamp: timestamp,
          source: "instagram_webhook",
          platform: "instagram",
        },
      },
    });

    await db.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    const fullMessage = await db.message.findUnique({
      where: { id: message.id },
      include: {
        conversation: true,
      },
    });

    if (fullMessage) {
      const messageEvent = {
        message: {
          id: fullMessage.id,
          text: fullMessage.text,
          role: fullMessage.role,
          createdAt: fullMessage.createdAt.toISOString(),
          meta: fullMessage.meta,
        },
        conversation: {
          id: conversation.id,
          psid: conversation.psid,
          status: conversation.status,
          autoBot: conversation.autoBot,
          platform: "INSTAGRAM",
        },
      };

      socketService.emitToConversation(conversation.id, "message:new", messageEvent);
      socketService.emitToCompany(instagramConnection.companyId, "message:new", messageEvent);

      // Emit conversation:view-update for real-time UI updates (for ConversationsList)
      socketService.emitToCompany(
        instagramConnection.companyId,
        "conversation:view-update",
        {
          conversationId: conversation.id,
          type: "new_message",
          message: {
            text: fullMessage.text,
            role: fullMessage.role,
            createdAt: fullMessage.createdAt.toISOString(),
          },
          lastMessageAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        }
      );
    }

    if (conversation.autoBot) {
      const botResponse = await RAGChatbot.generateResponse(
        messageText,
        instagramConnection.companyId,
        conversation.id
      );

      if (botResponse.response) {
        const botMessage = await db.message.create({
          data: {
            conversationId: conversation.id,
            text: botResponse.response,
            role: "BOT",
            meta: {
              ragContext: JSON.parse(JSON.stringify(botResponse.context)),
              ragUsage: botResponse.usage,
              ragMemory: JSON.parse(JSON.stringify(botResponse.memory)),
              timestamp: Date.now(),
              source: "auto_bot",
              platform: "instagram",
            },
          },
        });

        const botMessageEvent = {
          message: {
            id: botMessage.id,
            text: botMessage.text,
            role: botMessage.role,
            createdAt: botMessage.createdAt.toISOString(),
            meta: botMessage.meta,
          },
          conversation: {
            id: conversation.id,
            psid: conversation.psid,
            status: conversation.status,
            autoBot: conversation.autoBot,
            platform: "INSTAGRAM",
          },
        };

        socketService.emitToConversation(conversation.id, "message:new", botMessageEvent);
        socketService.emitToCompany(instagramConnection.companyId, "message:new", botMessageEvent);

        // Emit conversation:view-update for real-time UI updates (for ConversationsList)
        socketService.emitToCompany(
          instagramConnection.companyId,
          "conversation:view-update",
          {
            conversationId: conversation.id,
            type: "new_message",
            message: {
              text: botMessage.text,
              role: botMessage.role,
              createdAt: botMessage.createdAt.toISOString(),
            },
            lastMessageAt: new Date().toISOString(),
            autoBot: conversation.autoBot,
            timestamp: new Date().toISOString(),
          }
        );
      }
    }
  } catch (error) {
    console.error("Instagram message processing failed:", error);
    throw error;
  }
}

// Simple queue service interface for webhooks
export const queueService = {
  async addJob(jobName: string, data: any) {
    try {
      const messageQueue = await getIncomingMessageQueue();
      await messageQueue.add(jobName, data);
      return true;
    } catch (error) {
      console.error(`Failed to add job ${jobName} to queue:`, error);
      throw error;
    }
  },

  isRedisAvailable(): boolean {
    try {
      return redis !== null && redis.status === "ready";
    } catch {
      return false;
    }
  }
};

// Note: Workers will be initialized when needed via initializeWorkers()
// This prevents Redis connection errors during module loading

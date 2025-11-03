import { db } from "./db";
import { decrypt } from "./encryption";

/**
 * Helper functions for Instagram conversation management using Instagram Business API
 * According to the Instagram API documentation
 */

export interface InstagramConversation {
  id: string;
  updated_time: string;
}

export interface InstagramConversationResponse {
  data: InstagramConversation[];
}

/**
 * Find existing conversation between Instagram business account and specific user
 * Uses Instagram Graph API /me/conversations?user_id=<IGSID> endpoint
 */
export async function findInstagramConversationByUser(
  instagramUserId: string, 
  customerIGSID: string,
  accessToken: string
): Promise<string | null> {
  try {
    console.log(`🔍 Looking for Instagram conversation between business ${instagramUserId} and user ${customerIGSID}`);
    
    const response = await fetch(
      `https://graph.instagram.com/v23.0/me/conversations?user_id=${customerIGSID}&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to find Instagram conversation:', error);
      return null;
    }

    const data: InstagramConversationResponse = await response.json();
    
    if (data.data && data.data.length > 0) {
      const conversationId = data.data[0].id;
      console.log(`✅ Found existing Instagram conversation: ${conversationId}`);
      return conversationId;
    }
    
    console.log(`ℹ️ No existing conversation found between business and user ${customerIGSID}`);
    return null;
  } catch (error) {
    console.error('❌ Error finding Instagram conversation:', error);
    return null;
  }
}

/**
 * Get or create conversation in our database, ensuring we don't create duplicates
 * This addresses the duplicate conversation issue you're experiencing
 */
export async function getOrCreateInstagramConversation(
  instagramConnectionId: string,
  customerIGSID: string,
  accessToken?: string,
  skipCreate: boolean = false // Add flag to prevent creation when called from reply context
): Promise<any> {
  try {
    console.log(`🔍 Getting or creating Instagram conversation for connection ${instagramConnectionId} and user ${customerIGSID} (skipCreate: ${skipCreate})`);
    
    // STEP 1: Try to find existing OPEN or SNOOZED conversation by exact PSID match
    // Don't return CLOSED conversations - create new one instead
    let conversation = await db.conversation.findFirst({
      where: {
        instagramConnectionId: instagramConnectionId,
        psid: customerIGSID,
        status: {
          in: ["OPEN", "SNOOZED"],
        },
      },
      orderBy: {
        lastMessageAt: "desc",
      },
      include: {
        instagramConnection: {
          include: { company: true }
        }
      }
    });

    if (conversation) {
      console.log(`✅ Found existing OPEN/SNOOZED conversation by PSID: ${conversation.id}`);
      return conversation;
    }

    // STEP 2: Look for existing conversations with similar customer profile
    // This prevents duplicate conversations for the same Instagram user
    console.log(`🔍 No exact PSID match found, checking for similar conversations...`);
    
    const existingConversations = await db.conversation.findMany({
      where: {
        instagramConnectionId: instagramConnectionId,
        platform: 'INSTAGRAM'
      },
      include: {
        instagramConnection: {
          include: { company: true }
        }
      }
    });

    console.log(`🔍 Found ${existingConversations.length} existing Instagram conversations for this connection`);

    // Check if any existing conversation might be for the same user
    for (const existingConv of existingConversations) {
      const existingMeta = existingConv.meta as any;
      const existingProfile = existingMeta?.customerProfile;
      
      // Check for PSID similarity (last 4 digits) or username match
      const existingPsidSuffix = existingConv.psid?.slice(-4);
      const newPsidSuffix = customerIGSID?.slice(-4);
      
      console.log(`🔍 Comparing existing conversation ${existingConv.id}:`);
      console.log(`   Existing PSID: ${existingConv.psid} (suffix: ${existingPsidSuffix})`);
      console.log(`   New PSID: ${customerIGSID} (suffix: ${newPsidSuffix})`);
      
      // If the PSID suffixes match, this is likely the same user
      if (existingPsidSuffix && newPsidSuffix && existingPsidSuffix === newPsidSuffix) {
        console.log(`📍 Found matching PSID suffix! Updating existing conversation ${existingConv.id}`);
        
        // Update the existing conversation with the new PSID
        conversation = await db.conversation.update({
          where: { id: existingConv.id },
          data: {
            psid: customerIGSID, // Update to the latest PSID
            lastMessageAt: new Date(), // Update activity timestamp
            meta: {
              ...existingMeta,
              psidHistory: [
                ...(existingMeta?.psidHistory || []),
                {
                  oldPsid: existingConv.psid,
                  newPsid: customerIGSID,
                  updatedAt: new Date().toISOString(),
                  reason: 'duplicate_prevention'
                }
              ]
            }
          },
          include: {
            instagramConnection: {
              include: { company: true }
            }
          }
        });
        
        console.log(`✅ Updated existing conversation ${conversation.id} with new PSID ${customerIGSID}`);
        return conversation;
      }
    }
    
    // STEP 3: Check if we should skip creation (when called from agent reply)
    if (skipCreate) {
      console.log(`⚠️ No matching conversation found for ${customerIGSID} and skipCreate=true, not creating new conversation`);
      return null;
    }
    
    console.log(`📝 No existing conversation found, will create new one...`);

    // STRICT DUPLICATE PREVENTION: Check one more time for any conversation with same PSID suffix
    console.log(`🛑 STRICT CHECK: Verifying no conversation exists with PSID suffix ${customerIGSID.slice(-4)}`);
    const strictCheck = await db.conversation.findMany({
      where: {
        instagramConnectionId: instagramConnectionId,
        platform: 'INSTAGRAM'
      }
    });
    
    const matchingSuffix = strictCheck.find(conv => 
      conv.psid?.slice(-4) === customerIGSID.slice(-4)
    );
    
    if (matchingSuffix) {
      console.log(`🚫 STRICT PREVENTION: Found conversation ${matchingSuffix.id} with matching suffix. REFUSING to create duplicate.`);
      console.log(`   Existing: ${matchingSuffix.psid} (${matchingSuffix.psid?.slice(-4)})`);
      console.log(`   New: ${customerIGSID} (${customerIGSID.slice(-4)})`);
      console.log(`   🔄 Returning existing conversation instead`);
      
      return await db.conversation.findUnique({
        where: { id: matchingSuffix.id },
        include: {
          instagramConnection: {
            include: { company: true }
          }
        }
      });
    }

    // If not found by PSID, try to get customer profile and look for existing conversations
    // by customer identity (username) to handle PSID mismatches
    const connectionForProfile = await db.instagramConnection.findUnique({
      where: { id: instagramConnectionId },
      include: { company: true }
    });

    if (connectionForProfile) {
      try {
        const decryptedToken = await decrypt(connectionForProfile.accessTokenEnc);
        const customerProfile = await getInstagramUserProfile(customerIGSID, decryptedToken);
        
        if (customerProfile?.username) {
          console.log(`🔎 Looking for existing conversation with customer @${customerProfile.username}`);
          
          // Look for existing conversations with the same Instagram username
          const existingConversations = await db.conversation.findMany({
            where: {
              instagramConnectionId: instagramConnectionId,
              platform: 'INSTAGRAM'
            },
            include: {
              instagramConnection: {
                include: { company: true }
              }
            }
          });
          
          // Check if any existing conversation is for the same customer
          for (const existingConv of existingConversations) {
            const existingMeta = existingConv.meta as any;
            const existingProfile = existingMeta?.customerProfile;
            
            if (existingProfile?.username === customerProfile.username) {
              console.log(`📍 Found existing conversation for @${customerProfile.username} with different PSID!`);
              console.log(`   Existing PSID: ${existingConv.psid}`);
              console.log(`   New PSID: ${customerIGSID}`);
              console.log(`   Updating conversation PSID to latest value`);
              
              // Update the existing conversation with the new PSID
              conversation = await db.conversation.update({
                where: { id: existingConv.id },
                data: { 
                  psid: customerIGSID, // Update to the latest PSID
                  meta: {
                    ...existingMeta,
                    customerProfile: {
                      ...existingProfile,
                      ...customerProfile,
                      psidHistory: [
                        ...(existingProfile.psidHistory || []),
                        {
                          psid: existingConv.psid,
                          updatedAt: new Date().toISOString(),
                          reason: 'psid_mismatch_consolidation'
                        }
                      ]
                    }
                  }
                },
                include: {
                  instagramConnection: {
                    include: { company: true }
                  }
                }
              });
              
              console.log(`✅ Updated existing conversation ${conversation.id} with new PSID ${customerIGSID}`);
              return conversation;
            }
          }
        }
      } catch (profileError) {
        console.warn('⚠️ Failed to get customer profile for duplicate check:', profileError);
      }
    }

    // If not found in database, check Instagram API to see if conversation exists there
    if (accessToken) {
      const connectionForApi = await db.instagramConnection.findUnique({
        where: { id: instagramConnectionId },
        include: { company: true }
      });

      if (connectionForApi) {
        const decryptedToken = await decrypt(connectionForApi.accessTokenEnc);
        const apiConversationId = await findInstagramConversationByUser(
          connectionForApi.instagramUserId,
          customerIGSID,
          decryptedToken
        );

        if (apiConversationId) {
          console.log(`📍 Instagram API says conversation exists: ${apiConversationId}`);
          // We found the conversation exists in Instagram but not in our DB
          // This might happen if the conversation was created outside our system
        }
      }
    }

    // Create new conversation since it doesn't exist
    console.log(`🆕 Creating new Instagram conversation for user ${customerIGSID}`);
    
    const connectionForCreation = await db.instagramConnection.findUnique({
      where: { id: instagramConnectionId },
      include: { company: true }
    });

    if (!connectionForCreation) {
      throw new Error(`Instagram connection not found: ${instagramConnectionId}`);
    }

    // Create customer profile for new conversation
    const newCustomerProfile = {
      firstName: `Instagram User`,
      lastName: `${customerIGSID.slice(-4)}`,
      fullName: `Instagram User ${customerIGSID.slice(-4)}`,
      profilePicture: null,
      instagramUrl: `https://www.instagram.com/direct/t/${customerIGSID}`,
      platform: "instagram",
      cached: true,
      cachedAt: new Date().toISOString(),
    };

    // FINAL CHECK: Before creating, do one more check for existing conversations
    console.log(`🔍 Final duplicate check before creating conversation...`);
    const finalCheck = await db.conversation.findMany({
      where: {
        instagramConnectionId: instagramConnectionId,
        platform: 'INSTAGRAM'
      }
    });
    
    const psidSuffix = customerIGSID.slice(-4);
    const existingWithSameSuffix = finalCheck.find(conv => 
      conv.psid?.slice(-4) === psidSuffix
    );
    
    if (existingWithSameSuffix) {
      console.log(`⚠️ DUPLICATE PREVENTION: Found existing conversation ${existingWithSameSuffix.id} with same PSID suffix ${psidSuffix}`);
      console.log(`   Existing PSID: ${existingWithSameSuffix.psid}`);
      console.log(`   New PSID: ${customerIGSID}`);
      console.log(`   🚫 REFUSING TO CREATE DUPLICATE - returning existing conversation`);
      
      // Return the existing conversation instead of creating a duplicate
      return await db.conversation.findUnique({
        where: { id: existingWithSameSuffix.id },
        include: {
          instagramConnection: {
            include: { company: true }
          }
        }
      });
    }

    // Create conversation only if no duplicates found
    console.log(`✅ No duplicates found, creating new conversation for PSID ${customerIGSID}`);
    
    // ABSOLUTE FINAL CHECK: Use database transaction to prevent race conditions
    try {
      conversation = await db.conversation.create({
      data: {
        instagramConnectionId: instagramConnectionId,
        psid: customerIGSID,
        platform: 'INSTAGRAM',
        status: "OPEN",
        autoBot: connectionForCreation.autoBot, // Use Instagram connection's autoBot setting
        lastMessageAt: new Date(),
        tags: [],
        meta: { customerProfile: newCustomerProfile, platform: "instagram" },
      },
      include: {
        instagramConnection: {
          include: { company: true }
        }
      }
    });
    console.log(`✅ Created new Instagram conversation: ${conversation.id}, autoBot: ${connectionForCreation.autoBot} (from Instagram connection setting)`);
    } catch (createError: any) {
      // If creation fails due to unique constraint (race condition), find the existing one
      if (createError.code === 'P2002') {
        console.log(`⚠️ Race condition detected! Another process created conversation for PSID ${customerIGSID}`);
        console.log(`🔍 Looking for the conversation that was just created...`);
        
        const existingConversation = await db.conversation.findUnique({
          where: {
            instagramConnectionId_psid: {
              instagramConnectionId: instagramConnectionId,
              psid: customerIGSID,
            },
          },
          include: {
            instagramConnection: {
              include: { company: true }
            }
          }
        });
        
        if (existingConversation) {
          console.log(`✅ Found the conversation created by race condition: ${existingConversation.id}`);
          return existingConversation;
        }
      }
      
      // Re-throw if it's a different error
      throw createError;
    }

    console.log(`✅ Created new Instagram conversation: ${conversation.id}`);
    return conversation;

  } catch (error) {
    console.error('❌ Error getting or creating Instagram conversation:', error);
    throw error;
  }
}

/**
 * Enhanced function to get customer profile from Instagram API
 * Uses the Instagram User Profile API documented in your requirements
 */
export async function getInstagramUserProfile(
  customerIGSID: string,
  accessToken: string
): Promise<any> {
  try {
    console.log(`👤 Getting Instagram user profile for ${customerIGSID}`);
    
    const response = await fetch(
      `https://graph.instagram.com/v23.0/${customerIGSID}?fields=name,username,profile_pic,follower_count,is_user_follow_business,is_business_follow_user&access_token=${accessToken}`
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Failed to get Instagram user profile:', error);
      return null;
    }

    const profile = await response.json();
    console.log(`✅ Got Instagram user profile: @${profile.username}`);
    
    return {
      firstName: profile.name?.split(' ')[0] || 'Instagram User',
      lastName: profile.name?.split(' ').slice(1).join(' ') || profile.username || customerIGSID.slice(-4),
      fullName: profile.name || `@${profile.username}` || `Instagram User ${customerIGSID.slice(-4)}`,
      username: profile.username,
      profilePicture: profile.profile_pic,
      followerCount: profile.follower_count,
      isFollowingBusiness: profile.is_user_follow_business,
      businessFollowsUser: profile.is_business_follow_user,
      instagramUrl: `https://www.instagram.com/${profile.username}` || `https://www.instagram.com/direct/t/${customerIGSID}`,
      platform: "instagram",
      cached: true,
      cachedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('❌ Error getting Instagram user profile:', error);
    return {
      firstName: `Instagram User`,
      lastName: `${customerIGSID.slice(-4)}`,
      fullName: `Instagram User ${customerIGSID.slice(-4)}`,
      profilePicture: null,
      instagramUrl: `https://www.instagram.com/direct/t/${customerIGSID}`,
      platform: "instagram",
      cached: false,
      cachedAt: new Date().toISOString(),
    };
  }
}
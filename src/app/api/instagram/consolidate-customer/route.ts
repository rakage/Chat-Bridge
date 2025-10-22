import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateInstagramConversation } from "@/lib/instagram-conversation-helper";
import { db } from "@/lib/db";

/**
 * Test endpoint to consolidate conversations for a specific customer
 * This helps test the PSID mismatch handling
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { customerUsername, newPSID, instagramConnectionId } = await request.json();
    
    if (!customerUsername && !newPSID) {
      return NextResponse.json({ 
        error: "Either customerUsername or newPSID is required" 
      }, { status: 400 });
    }

    console.log(`🔄 Testing consolidation for customer: @${customerUsername} with PSID: ${newPSID}`);

    // Get Instagram connection
    let instagramConnection;
    if (instagramConnectionId) {
      instagramConnection = await db.instagramConnection.findUnique({
        where: { id: instagramConnectionId },
        include: { company: true }
      });
    } else {
      // Get the first Instagram connection for this company
      instagramConnection = await db.instagramConnection.findFirst({
        where: { 
          companyId: session.user.companyId,
          isActive: true 
        },
        include: { company: true }
      });
    }

    if (!instagramConnection) {
      return NextResponse.json({ error: "No Instagram connection found" }, { status: 404 });
    }

    console.log(`📱 Using Instagram connection: @${instagramConnection.username}`);

    // If we have a username, find conversations for that customer
    if (customerUsername) {
      const existingConversations = await db.conversation.findMany({
        where: {
          instagramConnectionId: instagramConnection.id,
          platform: 'INSTAGRAM'
        }
      });

      const customerConversations = existingConversations.filter(conv => {
        const meta = conv.meta as any;
        const profile = meta?.customerProfile;
        return profile?.username === customerUsername;
      });

      console.log(`📊 Found ${customerConversations.length} existing conversations for @${customerUsername}`);

      if (customerConversations.length > 1) {
        // Multiple conversations found - consolidate them
        customerConversations.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const primaryConversation = customerConversations[0];
        const duplicateConversations = customerConversations.slice(1);

        console.log(`📌 Primary conversation: ${primaryConversation.id}`);
        console.log(`🗑️ Will consolidate ${duplicateConversations.length} duplicates`);

        for (const duplicate of duplicateConversations) {
          // Move messages
          await db.message.updateMany({
            where: { conversationId: duplicate.id },
            data: { conversationId: primaryConversation.id }
          });

          // Delete duplicate conversation
          await db.conversation.delete({
            where: { id: duplicate.id }
          });

          console.log(`✅ Consolidated conversation ${duplicate.id} into ${primaryConversation.id}`);
        }

        return NextResponse.json({
          success: true,
          action: "consolidated",
          primaryConversationId: primaryConversation.id,
          consolidatedCount: duplicateConversations.length,
          customerUsername
        });
      } else if (customerConversations.length === 1) {
        return NextResponse.json({
          success: true,
          action: "no_consolidation_needed",
          conversationId: customerConversations[0].id,
          customerUsername
        });
      } else {
        return NextResponse.json({
          success: false,
          error: `No conversations found for customer @${customerUsername}`
        }, { status: 404 });
      }
    }

    // If we have a new PSID, test the helper function
    if (newPSID) {
      console.log(`🧪 Testing conversation helper with PSID: ${newPSID}`);
      
      const result = await getOrCreateInstagramConversation(
        instagramConnection.id,
        newPSID
      );

      return NextResponse.json({
        success: true,
        action: "helper_test",
        conversationId: result.id,
        psid: result.psid,
        customerProfile: (result.meta as any)?.customerProfile,
        wasExisting: result.createdAt < new Date(Date.now() - 1000) // Created more than 1 second ago
      });
    }

    // If neither customerUsername nor newPSID conditions are met
    return NextResponse.json({
      error: "Invalid request parameters"
    }, { status: 400 });

  } catch (error) {
    console.error("❌ Error in consolidation test:", error);
    return NextResponse.json(
      { error: "Failed to test consolidation" },
      { status: 500 }
    );
  }
}
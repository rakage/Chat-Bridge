import { db } from "./db";

export interface LastSeenRecord {
  conversationId: string;
  lastSeenAt: Date;
}

export class LastSeenService {
  static async getUserLastSeen(userId: string): Promise<Map<string, Date>> {
    try {
      // Check if the model exists in Prisma client
      if (!db.conversationLastSeen) {
        console.warn("⚠️ ConversationLastSeen model not found in Prisma client. Please run: npx prisma generate");
        return new Map<string, Date>();
      }

      const records = await db.conversationLastSeen.findMany({
        where: {
          userId: userId
        },
        select: {
          conversationId: true,
          lastSeenAt: true
        }
      });

      // Convert to Map for easy lookup
      const lastSeenMap = new Map<string, Date>();
      records.forEach((record) => {
        lastSeenMap.set(record.conversationId, new Date(record.lastSeenAt));
      });

      console.log(`📊 Loaded ${lastSeenMap.size} last seen records for user ${userId}`);
      return lastSeenMap;
    } catch (error) {
      console.error("❌ Failed to fetch last seen data:", error);
      return new Map<string, Date>();
    }
  }

  static async updateLastSeen(
    userId: string, 
    conversationId: string, 
    timestamp?: Date
  ): Promise<void> {
    try {
      // Check if the model exists in Prisma client
      if (!db.conversationLastSeen) {
        console.warn("⚠️ ConversationLastSeen model not found in Prisma client. Please run: npx prisma generate");
        return;
      }

      const lastSeenAt = timestamp || new Date();

      await db.conversationLastSeen.upsert({
        where: {
          userId_conversationId: {
            userId,
            conversationId
          }
        },
        update: {
          lastSeenAt: lastSeenAt
        },
        create: {
          userId,
          conversationId,
          lastSeenAt: lastSeenAt
        }
      });

      console.log(`✅ Updated last seen for conversation ${conversationId}`);
    } catch (error) {
      console.error("❌ Failed to update last seen:", error);
    }
  }

  static async markConversationsAsSeen(
    userId: string, 
    conversationIds: string[]
  ): Promise<void> {
    const promises = conversationIds.map(id => 
      this.updateLastSeen(userId, id)
    );
    
    await Promise.all(promises);
  }
}

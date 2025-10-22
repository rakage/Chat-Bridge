-- Migration: Add conversation_last_seen table using Prisma
-- This table tracks when users last viewed each conversation

-- Drop table if exists (for clean migration)
DROP TABLE IF EXISTS "conversation_last_seen";

-- Create table with proper column names matching Prisma schema
CREATE TABLE "conversation_last_seen" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_last_seen_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint
CREATE UNIQUE INDEX "conversation_last_seen_userId_conversationId_key" ON "conversation_last_seen"("userId", "conversationId");

-- Create indexes for performance
CREATE INDEX "conversation_last_seen_userId_idx" ON "conversation_last_seen"("userId");
CREATE INDEX "conversation_last_seen_conversationId_idx" ON "conversation_last_seen"("conversationId");

SELECT 'Migration completed successfully!' as status;

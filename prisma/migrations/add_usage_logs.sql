-- Add UsageType enum
CREATE TYPE "UsageType" AS ENUM ('TRAINING', 'AUTO_RESPONSE');

-- Create usage_logs table
CREATE TABLE "usage_logs" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "UsageType" NOT NULL,
    "provider" "Provider" NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "usage_logs_companyId_createdAt_idx" ON "usage_logs"("companyId", "createdAt");
CREATE INDEX "usage_logs_companyId_type_idx" ON "usage_logs"("companyId", "type");
CREATE INDEX "usage_logs_createdAt_idx" ON "usage_logs"("createdAt");

-- Add foreign key constraint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

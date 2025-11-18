-- Add embeddingModel column to provider_configs table
-- This migration adds support for configurable embedding models for document training

ALTER TABLE "provider_configs" 
ADD COLUMN "embeddingModel" TEXT;

-- Add a comment to describe the column
COMMENT ON COLUMN "provider_configs"."embeddingModel" IS 'Model used for embeddings during document training. If null, defaults to provider-specific default model.';

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enable Row Level Security by default
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create custom types/enums
CREATE TYPE "Role" AS ENUM ('OWNER', 'ADMIN', 'AGENT');
CREATE TYPE "Provider" AS ENUM ('OPENAI', 'GEMINI', 'OPENROUTER');
CREATE TYPE "ConvStatus" AS ENUM ('OPEN', 'SNOOZED', 'CLOSED');
CREATE TYPE "MsgRole" AS ENUM ('USER', 'AGENT', 'BOT');
CREATE TYPE "DocumentType" AS ENUM ('PDF', 'DOC', 'DOCX', 'TXT');
CREATE TYPE "DocumentStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'PROCESSED', 'ERROR');
CREATE TYPE "TrainingStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- Create companies table
CREATE TABLE "companies" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- Create users table
CREATE TABLE "users" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'AGENT',
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- Create sessions table (for NextAuth)
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- Create accounts table (for NextAuth)
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- Create verification_tokens table (for NextAuth)
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- Create provider_configs table
CREATE TABLE "provider_configs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL DEFAULT 'OPENAI',
    "apiKeyEnc" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "maxTokens" INTEGER NOT NULL DEFAULT 512,
    "systemPrompt" TEXT NOT NULL DEFAULT 'You are a helpful, brand-safe support assistant...',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_configs_pkey" PRIMARY KEY ("id")
);

-- Create page_connections table
CREATE TABLE "page_connections" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT NOT NULL,
    "pageAccessTokenEnc" TEXT NOT NULL,
    "verifyTokenEnc" TEXT NOT NULL,
    "subscribed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_connections_pkey" PRIMARY KEY ("id")
);

-- Create conversations table
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "pageId" TEXT NOT NULL,
    "psid" TEXT NOT NULL,
    "status" "ConvStatus" NOT NULL DEFAULT 'OPEN',
    "autoBot" BOOLEAN NOT NULL DEFAULT false,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigneeId" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "customerEmail" TEXT,
    "customerPhone" TEXT,
    "customerAddress" TEXT,
    "freshdeskTickets" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- Create messages table
CREATE TABLE "messages" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "conversationId" TEXT NOT NULL,
    "role" "MsgRole" NOT NULL,
    "text" TEXT NOT NULL,
    "providerUsed" "Provider",
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- Create documents table
CREATE TABLE "documents" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "fileType" "DocumentType" NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "extractedText" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- Create training_sessions table
CREATE TABLE "training_sessions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "status" "TrainingStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "startedById" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

-- Create document_chunks table
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "documentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "tokenCount" INTEGER,
    "embedding" vector(768),
    "embeddingId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- Create vector_searches table
CREATE TABLE "vector_searches" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vector_searches_pkey" PRIMARY KEY ("id")
);

-- Create freshdesk_integrations table
CREATE TABLE "freshdesk_integrations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "apiKeyEnc" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "autoCreate" BOOLEAN NOT NULL DEFAULT true,
    "defaultPriority" INTEGER NOT NULL DEFAULT 2,
    "defaultStatus" INTEGER NOT NULL DEFAULT 2,
    "defaultSource" INTEGER NOT NULL DEFAULT 7,
    "defaultGroupId" BIGINT,
    "escalationRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freshdesk_integrations_pkey" PRIMARY KEY ("id")
);

-- Create many-to-many relationship table for documents and training sessions
CREATE TABLE "_DocumentToTrainingSession" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- Create unique indexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");
CREATE UNIQUE INDEX "provider_configs_companyId_key" ON "provider_configs"("companyId");
CREATE UNIQUE INDEX "page_connections_pageId_key" ON "page_connections"("pageId");
CREATE UNIQUE INDEX "conversations_pageId_psid_key" ON "conversations"("pageId", "psid");
CREATE UNIQUE INDEX "document_chunks_documentId_chunkIndex_key" ON "document_chunks"("documentId", "chunkIndex");
CREATE UNIQUE INDEX "freshdesk_integrations_companyId_key" ON "freshdesk_integrations"("companyId");
CREATE UNIQUE INDEX "_DocumentToTrainingSession_AB_unique" ON "_DocumentToTrainingSession"("A", "B");

-- Create regular indexes for performance
CREATE INDEX "_DocumentToTrainingSession_B_index" ON "_DocumentToTrainingSession"("B");
CREATE INDEX "conversations_pageId_idx" ON "conversations"("pageId");
CREATE INDEX "conversations_status_idx" ON "conversations"("status");
CREATE INDEX "conversations_lastMessageAt_idx" ON "conversations"("lastMessageAt" DESC);
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");
CREATE INDEX "messages_createdAt_idx" ON "messages"("createdAt" DESC);
CREATE INDEX "documents_companyId_idx" ON "documents"("companyId");
CREATE INDEX "documents_status_idx" ON "documents"("status");
CREATE INDEX "document_chunks_companyId_idx" ON "document_chunks"("companyId");
CREATE INDEX "document_chunks_documentId_idx" ON "document_chunks"("documentId");

-- Create vector indexes for similarity search
CREATE INDEX "document_chunks_embedding_idx" ON "document_chunks" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "provider_configs" ADD CONSTRAINT "provider_configs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "page_connections" ADD CONSTRAINT "page_connections_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "page_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_startedById_fkey" FOREIGN KEY ("startedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_chunks" ADD CONSTRAINT "document_chunks_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vector_searches" ADD CONSTRAINT "vector_searches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "freshdesk_integrations" ADD CONSTRAINT "freshdesk_integrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DocumentToTrainingSession" ADD CONSTRAINT "_DocumentToTrainingSession_A_fkey" FOREIGN KEY ("A") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_DocumentToTrainingSession" ADD CONSTRAINT "_DocumentToTrainingSession_B_fkey" FOREIGN KEY ("B") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamps
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_configs_updated_at BEFORE UPDATE ON provider_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_page_connections_updated_at BEFORE UPDATE ON page_connections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_training_sessions_updated_at BEFORE UPDATE ON training_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_chunks_updated_at BEFORE UPDATE ON document_chunks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_freshdesk_integrations_updated_at BEFORE UPDATE ON freshdesk_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create helper functions for vector search and document management
CREATE OR REPLACE FUNCTION match_documents(
  query_embedding vector(768),
  company_id text,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id text,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.content,
    document_chunks.metadata,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE 
    document_chunks.companyId = company_id
    AND document_chunks.embedding IS NOT NULL
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION delete_company_documents(company_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM document_chunks WHERE companyId = company_id;
END;
$$;

CREATE OR REPLACE FUNCTION delete_document_chunks_by_document(document_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM document_chunks WHERE documentId = document_id;
END;
$$;

-- Enable Row Level Security on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vector_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE freshdesk_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_DocumentToTrainingSession" ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies

-- Service role has full access to everything
CREATE POLICY "Service role full access companies" ON companies FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access users" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access sessions" ON sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access accounts" ON accounts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access verification_tokens" ON verification_tokens FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access provider_configs" ON provider_configs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access page_connections" ON page_connections FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access conversations" ON conversations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access messages" ON messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access documents" ON documents FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access training_sessions" ON training_sessions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access document_chunks" ON document_chunks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access vector_searches" ON vector_searches FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access freshdesk_integrations" ON freshdesk_integrations FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access _DocumentToTrainingSession" ON "_DocumentToTrainingSession" FOR ALL USING (auth.role() = 'service_role');

-- Anonymous and authenticated users policies (using application-level authentication)
-- Since you're using NextAuth, we'll allow all operations and control access at the application level
CREATE POLICY "Allow all operations companies" ON companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations users" ON users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations sessions" ON sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations accounts" ON accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations verification_tokens" ON verification_tokens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations provider_configs" ON provider_configs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations page_connections" ON page_connections FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations conversations" ON conversations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations messages" ON messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations documents" ON documents FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations training_sessions" ON training_sessions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations document_chunks" ON document_chunks FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations vector_searches" ON vector_searches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations freshdesk_integrations" ON freshdesk_integrations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations _DocumentToTrainingSession" ON "_DocumentToTrainingSession" FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Add the existing vector embeddings functionality
CREATE TABLE IF NOT EXISTS document_embeddings (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS document_embeddings_company_id_idx 
ON document_embeddings USING btree ((metadata->>'companyId'));

CREATE INDEX IF NOT EXISTS document_embeddings_document_id_idx 
ON document_embeddings USING btree ((metadata->>'documentId'));

ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on embeddings" ON document_embeddings
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow all operations for anon and authenticated on embeddings" ON document_embeddings
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_document_embeddings_updated_at 
    BEFORE UPDATE ON document_embeddings 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

GRANT ALL ON document_embeddings TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_embeddings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON document_embeddings TO anon;

-- Add conversation last seen functionality
CREATE TABLE IF NOT EXISTS conversation_last_seen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  UNIQUE(user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS conversation_last_seen_user_id_idx 
ON conversation_last_seen USING btree (user_id);

CREATE INDEX IF NOT EXISTS conversation_last_seen_conversation_id_idx 
ON conversation_last_seen USING btree (conversation_id);

CREATE INDEX IF NOT EXISTS conversation_last_seen_user_conversation_idx 
ON conversation_last_seen USING btree (user_id, conversation_id);

CREATE TRIGGER update_conversation_last_seen_updated_at 
    BEFORE UPDATE ON conversation_last_seen 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION get_user_last_seen(user_id_param text)
RETURNS TABLE (
  conversation_id text,
  last_seen_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    conversation_last_seen.conversation_id,
    conversation_last_seen.last_seen_at
  FROM conversation_last_seen
  WHERE conversation_last_seen.user_id = user_id_param;
END;
$$;

CREATE OR REPLACE FUNCTION update_conversation_last_seen(
  user_id_param text,
  conversation_id_param text,
  last_seen_at_param timestamp with time zone DEFAULT NOW()
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO conversation_last_seen (user_id, conversation_id, last_seen_at)
  VALUES (user_id_param, conversation_id_param, last_seen_at_param)
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    last_seen_at = last_seen_at_param,
    updated_at = NOW();
END;
$$;

ALTER TABLE conversation_last_seen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can do everything on last_seen" ON conversation_last_seen
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow all operations for anon and authenticated on last_seen" ON conversation_last_seen
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT ALL ON conversation_last_seen TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_last_seen TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON conversation_last_seen TO anon;
GRANT EXECUTE ON FUNCTION get_user_last_seen TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_last_seen TO service_role;
GRANT EXECUTE ON FUNCTION update_conversation_last_seen TO authenticated;
GRANT EXECUTE ON FUNCTION update_conversation_last_seen TO service_role;

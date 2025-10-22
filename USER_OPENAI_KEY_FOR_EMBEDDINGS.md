# User's OpenAI Key for Embeddings - Implementation Complete

## Overview
The system now uses the company's own OpenAI API key for generating embeddings when available, instead of always using the global API key from environment variables. This allows each company to use their own OpenAI credits for embeddings.

## How It Works

### Priority Order
1. **First Priority**: If the company has configured OpenAI as their LLM provider in `ProviderConfig`, use their encrypted API key
2. **Fallback**: Use the global `OPENAI_API_KEY` from environment variables

### Modified Components

#### 1. Embedding Service (`src/lib/embeddings.ts`)
- Modified `generateEmbedding()` to accept an optional `apiKey` parameter
- Modified `generateEmbeddings()` to accept an optional `apiKey` parameter  
- Removed global OpenAI client initialization
- Added `getOpenAIClient()` method to create client instances with the provided or default API key

#### 2. RAG LLM Service (`src/lib/rag-llm.ts`)
- `generateResponse()` now retrieves the company's OpenAI key from `ProviderConfig` if available
- `searchDocuments()` now retrieves the company's OpenAI key from `ProviderConfig` if available
- Passes the key to `EmbeddingService.generateEmbedding()`

#### 3. RAG Chatbot (`src/lib/rag-chatbot.ts`)
- `generateResponse()` now retrieves the company's OpenAI key from `ProviderConfig` if available
- Passes the key to `EmbeddingService.generateEmbedding()`

#### 4. Training Route (`src/app/api/training/train/route.ts`)
- Retrieves company's OpenAI key before starting training session
- Passes the key to `processTrainingAsync()`
- The key is used when generating embeddings for document chunks

#### 5. RAG Search Route (`src/app/api/rag/search/route.ts`)
- Retrieves company's OpenAI key before generating query embedding
- Passes the key to `EmbeddingService.generateEmbedding()`

## Configuration

### For Users with OpenAI Provider
If a company has OpenAI configured in their LLM settings (via `ProviderConfig` table):
1. Their encrypted API key will be automatically used for embeddings
2. No additional configuration needed
3. Console logs will show: `🔑 Using company's OpenAI API key for embeddings`

### For Users without OpenAI Provider
If a company doesn't have OpenAI configured:
1. System falls back to the global `OPENAI_API_KEY` environment variable
2. Console logs will show: `🔑 Using global OpenAI API key for embeddings`

### Database Schema
The system uses the existing `ProviderConfig` table:
```prisma
model ProviderConfig {
  id           String   @id @default(cuid())
  companyId    String   @unique
  provider     Provider @default(OPENAI)  // OPENAI, GEMINI, or OPENROUTER
  apiKeyEnc    String                     // Encrypted API key
  model        String
  temperature  Float    @default(0.3)
  maxTokens    Int      @default(512)
  systemPrompt String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  company      Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

## Security
- API keys are stored encrypted in the database using the `encryption` library
- Keys are decrypted only when needed for API calls
- Keys are never exposed in logs or responses
- Falls back gracefully if decryption fails

## Error Handling
All API key retrieval operations are wrapped in try-catch blocks:
- If key retrieval fails, the system logs a warning and uses the global key
- If the global key is also missing, an error is thrown with a helpful message
- This ensures the system remains functional even if there are issues with key management

## Benefits
1. **Cost Distribution**: Each company pays for their own OpenAI usage
2. **API Rate Limits**: Companies don't share rate limits with each other
3. **Flexibility**: Companies can use different OpenAI accounts or plans
4. **Backward Compatible**: Existing setups without company keys continue to work

## Console Logs
The system now provides clear logging:
- `🔑 Using company's OpenAI API key for embeddings` - Company key is used
- `🔑 Using global OpenAI API key for embeddings (company doesn't have OpenAI configured)` - Global key is used
- `⚠️ Could not retrieve company OpenAI key, using global key` - Error occurred, falling back

## Testing
To test this feature:
1. Configure a company with OpenAI as their LLM provider (includes API key)
2. Upload and train documents - check logs for company key usage
3. Use RAG features (search, chat, playground) - check logs for company key usage
4. Compare with a company that doesn't have OpenAI configured - should use global key

## Implementation Date
January 2025

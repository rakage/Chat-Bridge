# Embedding Model Configuration Feature

## Overview
This feature adds the ability to configure which embedding model is used for document training on the knowledge base page. Users can now select different embedding models based on their chosen AI provider (OpenAI or Google Gemini).

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
- Added `embeddingModel` field to `ProviderConfig` model
- Field is optional (nullable) to maintain backward compatibility
- Type: `String?`

### 2. LLM Config Page (`src/app/dashboard/llm-config/page.tsx`)
Added embedding model selection UI with:
- **Provider-specific model options:**
  - **OpenAI:**
    - `text-embedding-3-small` (default)
    - `text-embedding-3-large`
    - `text-embedding-ada-002`
  - **Google Gemini:**
    - `text-embedding-004` (default)
    - `embedding-001`

- **UI Features:**
  - Dropdown selector for embedding model
  - Helper text explaining the model's purpose
  - Auto-updates embedding model when provider is changed
  - Displays selected embedding model in "Current Setup" section

### 3. API Route (`src/app/api/settings/provider/route.ts`)
- Updated validation schema to accept `embeddingModel` (optional)
- GET endpoint returns `embeddingModel` in config response
- POST endpoint saves `embeddingModel` to database
- Maintains backward compatibility with existing configs

### 4. Embedding Service (`src/lib/embeddings.ts`)
Updated to accept optional model parameter:
- `generateEmbedding()` - accepts optional `model` parameter
- `generateEmbeddings()` - accepts optional `model` parameter
- `generateGeminiEmbedding()` - accepts optional `modelName` parameter
- `generateGeminiEmbeddings()` - accepts optional `modelName` parameter
- Falls back to default models if not specified:
  - OpenAI: `text-embedding-3-small`
  - Gemini: `text-embedding-004`

### 5. Training API (`src/app/api/training/train/route.ts`)
- Retrieves `embeddingModel` from provider config
- Passes embedding model to `processTrainingAsync()`
- Uses configured model when calling `EmbeddingService.generateEmbeddings()`
- Logs the specific model used in training session
- Records model in `UsageLog` for token tracking

### 6. Training Page (`src/app/dashboard/training/page.tsx`)
- Already shows provider info from LLM config
- Will automatically reflect the embedding model being used

## Database Migration

### Manual Migration Required
Run the following SQL to add the `embeddingModel` column:

```sql
ALTER TABLE "provider_configs" 
ADD COLUMN "embeddingModel" TEXT;

COMMENT ON COLUMN "provider_configs"."embeddingModel" IS 'Model used for embeddings during document training. If null, defaults to provider-specific default model.';
```

Or run: `npx prisma db push` (when database is accessible)

The migration file is available at: `migration-add-embedding-model.sql`

## How It Works

1. **User configures LLM settings:**
   - Goes to `/dashboard/llm-config`
   - Selects AI provider (OpenAI or Gemini)
   - Selects preferred embedding model from dropdown
   - Saves configuration

2. **Training uses configured model:**
   - User uploads documents to `/dashboard/training`
   - Selects documents and starts training
   - System retrieves embedding model from provider config
   - Uses that specific model to generate embeddings
   - Stores embeddings in database

3. **Token tracking:**
   - System logs which embedding model was used
   - Tracks token usage per model
   - Displays in LLM Config page under "Token Usage History"

## Benefits

- **Flexibility:** Choose the best embedding model for your use case
- **Cost optimization:** Select smaller/cheaper models when appropriate
- **Quality control:** Use larger models for better embedding quality
- **Transparency:** Clear visibility of which model is being used
- **Backward compatible:** Existing configs continue to work with default models

## Testing Checklist

- [ ] Configure OpenAI provider with different embedding models
- [ ] Configure Gemini provider with different embedding models
- [ ] Switch between providers and verify model updates automatically
- [ ] Train documents and verify correct model is used
- [ ] Check token usage logs show correct model name
- [ ] Verify existing configs without embedding model still work (backward compatibility)
- [ ] Test that training page shows provider and model info correctly

## Notes

- Embedding models are provider-specific
- Changing the embedding model mid-training may affect similarity search results
- For best results, retrain all documents when changing embedding models
- The selected embedding model only affects document training, not chat responses

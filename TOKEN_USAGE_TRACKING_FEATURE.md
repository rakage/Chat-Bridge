# Token Usage Tracking Feature

## Overview
This feature tracks token usage for both **Training/Embedding** and **AI Auto-Response** operations, displaying the history in a dedicated section on the `/dashboard/llm-config` page.

## What Was Implemented

### 1. Database Schema (`prisma/schema.prisma`)
- **UsageLog model** already exists with:
  - `type`: TRAINING or AUTO_RESPONSE
  - `provider`: OPENAI or GEMINI
  - `model`: The model used
  - `inputTokens`, `outputTokens`, `totalTokens`: Token counts
  - `metadata`: Additional context (document names, conversation ID, etc.)
  - `createdAt`: Timestamp

### 2. Backend Changes

#### Training API (`src/app/api/training/train/route.ts`)
- ✅ Already logs token usage when training/embedding documents
- Logs are created after successful embedding generation
- Includes metadata: sessionId, documentCount, documentNames, totalChunks

#### RAG Chat API (`src/app/api/rag/chat/route.ts`)
- ✅ **NEW**: Logs token usage for auto-response
- Only logs when `internal: true` (from auto-bot/queue worker)
- Includes metadata: conversationId, message preview, sourceDocuments, relevantChunks

#### Usage Logs API (`src/app/api/usage-logs/route.ts`)
- ✅ **NEW**: GET endpoint to fetch usage history
- Supports filtering by type (TRAINING, AUTO_RESPONSE, or all)
- Pagination support (limit, offset)
- Returns statistics grouped by type:
  - Total tokens used
  - Input/output token breakdown
  - Request count

### 3. Frontend Changes (`src/app/dashboard/llm-config/page.tsx`)

#### New UI Components Added:
1. **Statistics Cards** (3 cards):
   - Total Tokens (overall usage)
   - Training Tokens
   - Auto-Response Tokens

2. **Filter Tabs**:
   - All
   - Training
   - Auto-Response

3. **Usage History Table** with columns:
   - Type (badge with icon)
   - Provider (with logo)
   - Model
   - Input Tokens
   - Output Tokens
   - Total Tokens
   - Date

#### Features:
- Real-time loading state
- Empty state with helpful message
- Automatic data refresh on filter change
- Formatted numbers with thousand separators
- Color-coded badges for different types

## Database Migration

### Required Migration
Run this SQL to create the `usage_logs` table:

```bash
# For Supabase or direct PostgreSQL:
psql $DATABASE_URL -f prisma/migrations/add_usage_logs.sql

# Or using Prisma:
npx prisma db push
```

The migration file is located at: `prisma/migrations/add_usage_logs.sql`

## How It Works

### Training Flow:
1. User trains documents via `/dashboard/training`
2. Training API generates embeddings
3. Token count is calculated during embedding generation
4. **UsageLog** is created with type `TRAINING`
5. Logs appear in LLM Config page

### Auto-Response Flow:
1. Customer sends message (Facebook/Instagram/Telegram/Widget)
2. Auto-bot is triggered (if enabled)
3. Queue worker calls RAG Chat API with `internal: true`
4. RAG generates response and tracks token usage
5. **UsageLog** is created with type `AUTO_RESPONSE`
6. Logs appear in LLM Config page

## Testing

### 1. Verify Migration
```bash
# Check if table exists
psql $DATABASE_URL -c "SELECT * FROM usage_logs LIMIT 1;"
```

### 2. Test Training Logs
1. Go to `/dashboard/training`
2. Train some documents
3. Check `/dashboard/llm-config` - should see TRAINING logs

### 3. Test Auto-Response Logs
1. Enable auto-bot for Facebook/Instagram/Telegram
2. Send test messages
3. Check `/dashboard/llm-config` - should see AUTO_RESPONSE logs

### 4. Test API Endpoint
```bash
# Get all logs
curl http://localhost:3001/api/usage-logs

# Get training logs only
curl http://localhost:3001/api/usage-logs?type=TRAINING

# Get auto-response logs only
curl http://localhost:3001/api/usage-logs?type=AUTO_RESPONSE
```

## Files Changed

### Modified:
- `src/app/api/rag/chat/route.ts` - Added token logging for auto-response
- `src/app/dashboard/llm-config/page.tsx` - Added usage history UI
- `prisma/schema.prisma` - Already had UsageLog model
- `src/app/api/training/train/route.ts` - Already had token logging

### Created:
- `src/app/api/usage-logs/route.ts` - New API endpoint
- `prisma/migrations/add_usage_logs.sql` - Database migration

## Future Enhancements

1. **Export to CSV** - Download usage logs
2. **Date Range Filter** - Filter by date range
3. **Cost Estimation** - Calculate costs based on provider pricing
4. **Charts/Graphs** - Visualize usage trends over time
5. **Alerts** - Notify when usage exceeds threshold
6. **Per-User Tracking** - Track usage by individual users

## Notes

- Token logging doesn't fail the request if it encounters errors (fail-safe)
- Logs are created after successful operations only
- Metadata field stores additional context for debugging/auditing
- All logs are company-scoped (multi-tenant safe)
- Indexes are optimized for fast filtering and sorting

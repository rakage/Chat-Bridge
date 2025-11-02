# Complete Token Usage Logging Fix

## Problem Summary
Token usage was **not being recorded** in the `usage_logs` table, even though the migration was successfully applied. The root cause was that token logging was only implemented in the RAG Chat API (playground), and **NOT in the webhook queue workers** where Instagram/Facebook/Telegram auto-bot responses are processed.

## What Was Fixed

### 1. **Core RAG Library** (`src/lib/rag-chatbot.ts`)
- ✅ Modified to return **actual token counts** from LLM APIs (OpenAI & Gemini)
- ✅ Replaced estimated token counts with real usage from API responses
- ✅ Both providers return: `promptTokens`, `completionTokens`, `totalTokens`

### 2. **All RAG Response Endpoints Now Log Token Usage**

#### ✅ Playground (`src/app/api/rag/chat/route.ts`)
- Now logs ALL playground RAG queries
- Was previously only logging webhook auto-bot calls
- Source: `playground`

#### ✅ Facebook Auto-Bot (`src/lib/queue.ts`)
- Added token logging for Facebook webhook responses
- Uses actual token counts from configured LLM provider
- Source: `webhook`, Platform: `facebook`

#### ✅ Instagram Auto-Bot (`src/lib/queue.ts`)
- Added token logging for Instagram webhook responses
- Tracks real usage from OpenAI/Gemini
- Source: `webhook`, Platform: `instagram`

#### ✅ Telegram Auto-Bot (`src/app/api/webhook/telegram/route.ts`)
- Added token logging for Telegram webhook responses
- Records actual LLM API usage
- Source: `webhook`, Platform: `telegram`

#### ✅ Widget Auto-Bot (`src/app/api/widget/messages/route.ts`)
- Added token logging for widget chat responses
- Includes fallback for missing provider config
- Source: `widget`, Platform: `widget`

#### ✅ Widget Init (`src/app/api/widget/init/route.ts`)
- Added token logging for widget initialization
- Tracks first auto-bot interaction
- Source: `widget_init`, Platform: `widget`

## What's Being Logged

Each usage log entry includes:

```json
{
  "companyId": "...",
  "type": "AUTO_RESPONSE" | "TRAINING",
  "provider": "OPENAI" | "GEMINI",
  "model": "gpt-4o" | "gemini-1.5-flash" | etc,
  "inputTokens": 1387,      // ← Actual from API
  "outputTokens": 190,       // ← Actual from API
  "totalTokens": 1577,       // ← Actual from API
  "metadata": {
    "conversationId": "...",
    "message": "first 100 chars...",
    "platform": "facebook" | "instagram" | "telegram" | "widget",
    "source": "webhook" | "playground" | "widget" | "widget_init",
    "isAutoBot": true,
    "sourceDocuments": [...] // For RAG responses
  }
}
```

## Token Count Accuracy

✅ **Real token counts from APIs:**
- OpenAI: `response.usage.prompt_tokens`, `response.usage.completion_tokens`
- Gemini: `response.usageMetadata.promptTokenCount`, `response.usageMetadata.candidatesTokenCount`

❌ **No more estimates:** Previously used `Math.ceil(text.length / 4)`

## Testing

### Quick Test - Send a message via Instagram
```bash
# Watch your logs while sending an Instagram DM
# You should now see:
✅ RAGChatbot: Generated response using OPENAI {
  usage: { promptTokens: 1387, completionTokens: 190, totalTokens: 1577 }
}
✅ Logged 1577 tokens (1387 prompt + 190 completion) for Instagram auto-bot
```

### Check Database
```bash
node check-usage-logs-table.js
```

### Query Logs
```sql
SELECT 
  type,
  provider,
  model,
  inputTokens,
  outputTokens,
  totalTokens,
  metadata->>'platform' as platform,
  metadata->>'source' as source,
  createdAt
FROM usage_logs
ORDER BY createdAt DESC
LIMIT 20;
```

## Log Output Examples

### Instagram Auto-Bot
```
✅ RAGChatbot: Generated response using OPENAI {
  usage: { promptTokens: 1387, completionTokens: 190, totalTokens: 1577 }
}
✅ Logged 1577 tokens (1387 prompt + 190 completion) for Instagram auto-bot
```

### Facebook Auto-Bot
```
✅ RAGChatbot: Generated response using OPENAI {
  usage: { promptTokens: 842, completionTokens: 156, totalTokens: 998 }
}
✅ Logged 998 tokens (842 prompt + 156 completion) for Facebook auto-bot
```

### Telegram Auto-Bot
```
✅ Logged 1234 tokens (920 prompt + 314 completion) for Telegram auto-bot
```

### Playground
```
✅ Logged 756 tokens (520 prompt + 236 completion)
```

### Widget
```
✅ Logged 892 tokens (634 prompt + 258 completion) for Widget auto-bot
```

## All Platforms Now Tracked

| Platform | Endpoint | Status | Source |
|----------|----------|--------|--------|
| Playground | `/api/rag/chat` | ✅ Fixed | `playground` |
| Facebook | Queue Worker | ✅ Added | `webhook` |
| Instagram | Queue Worker | ✅ Added | `webhook` |
| Telegram | `/api/webhook/telegram` | ✅ Added | `webhook` |
| Widget | `/api/widget/messages` | ✅ Added | `widget` |
| Widget Init | `/api/widget/init` | ✅ Added | `widget_init` |
| Training | `/api/training/train` | ✅ Already Working | `training` |

## Next Steps

1. **Test immediately**: Send messages via Instagram/Facebook to verify logging
2. **Build analytics**: Use `usage_logs` table to track token consumption
3. **Monitor costs**: Track usage by platform, provider, and model
4. **Set alerts**: Get notified when token usage exceeds thresholds

## Example Analytics Queries

### Total tokens by platform (last 7 days)
```sql
SELECT 
  metadata->>'platform' as platform,
  SUM(totalTokens) as total_tokens,
  COUNT(*) as request_count
FROM usage_logs
WHERE createdAt > NOW() - INTERVAL '7 days'
  AND type = 'AUTO_RESPONSE'
GROUP BY metadata->>'platform'
ORDER BY total_tokens DESC;
```

### Daily token usage
```sql
SELECT 
  DATE(createdAt) as date,
  provider,
  SUM(totalTokens) as total_tokens,
  COUNT(*) as requests
FROM usage_logs
GROUP BY DATE(createdAt), provider
ORDER BY date DESC;
```

### Average tokens per conversation
```sql
SELECT 
  AVG(totalTokens) as avg_total,
  AVG(inputTokens) as avg_input,
  AVG(outputTokens) as avg_output
FROM usage_logs
WHERE type = 'AUTO_RESPONSE';
```

## Files Changed
- `src/lib/rag-chatbot.ts`
- `src/app/api/rag/chat/route.ts`
- `src/lib/queue.ts`
- `src/app/api/webhook/telegram/route.ts`
- `src/app/api/widget/messages/route.ts`
- `src/app/api/widget/init/route.ts`

---

**Status**: ✅ Complete - All platforms now logging actual token usage from LLM APIs

# Token Usage Logging Fix

## Problem
Token usage was not being recorded in the `usage_logs` table even though the migration was applied successfully.

## Root Causes

### 1. **Conditional Logging in RAG Chat API**
The token logging code in `/api/rag/chat/route.ts` only ran when `body.internal === true`, which means it **ONLY logged for auto-bot webhook responses** (Facebook/Instagram), NOT for playground usage.

```typescript
// OLD CODE - Only logged for auto-bot
if (body.internal === true && usage && providerConfig) {
  // Log token usage...
}
```

### 2. **Using Estimated Tokens Instead of Actual**
The RAG chatbot was using rough estimates (`Math.ceil(text.length / 4)`) instead of actual token counts from LLM API responses.

```typescript
// OLD CODE - Estimates, not actual
usage: {
  promptTokens: this.estimateTokens(conversationContext + documentContext + query),
  completionTokens: this.estimateTokens(response),
  totalTokens: this.estimateTokens(conversationContext + documentContext + query + response),
}
```

## Solution

### 1. **Updated RAGChatbot to Return Actual Token Usage**
Modified `lib/rag-chatbot.ts` to:
- Return LLM response object with actual token usage from providers (OpenAI, Gemini)
- Extract and use real token counts from API responses
- Both OpenAI and Gemini APIs provide accurate token usage metadata

Changes:
- `generateWithLLM()` now returns `{ text: string, usage: {...} }`
- `generateWithGemini()` extracts token usage from `response.usageMetadata`
- RAG response now includes actual token counts, not estimates

### 2. **Updated RAG Chat API to Log All Requests**
Modified `/api/rag/chat/route.ts` to:
- Remove the `body.internal === true` condition
- Log token usage for **ALL RAG requests** (playground AND auto-bot)
- Add metadata to distinguish between sources (`webhook` vs `playground`)
- Handle cases where no provider config exists (fallback to Gemini)

```typescript
// NEW CODE - Logs for all requests
if (usage && usage.totalTokens > 0) {
  await db.usageLog.create({
    data: {
      companyId,
      type: "AUTO_RESPONSE",
      provider: providerConfig?.provider || "GEMINI",
      model: providerConfig?.model || "gemini-1.5-flash",
      inputTokens: usage.promptTokens || 0,
      outputTokens: usage.completionTokens || 0,
      totalTokens: usage.totalTokens || 0,
      metadata: {
        conversationId,
        message: message.substring(0, 100),
        sourceDocuments: contextInfo.sourceDocuments,
        relevantChunks: contextInfo.relevantChunks,
        isAutoBot: body.internal === true,
        source: body.internal === true ? 'webhook' : 'playground',
      },
    },
  });
}
```

## What's Now Logged

### RAG Chat Responses (`AUTO_RESPONSE` type)
- ✅ Playground RAG queries
- ✅ Auto-bot webhook responses (Facebook/Instagram/Telegram)
- ✅ Widget auto-bot responses
- Token counts: Actual from LLM APIs (not estimates)
- Metadata includes:
  - Source (playground vs webhook)
  - Conversation ID
  - Message preview
  - Relevant documents used
  - Auto-bot flag

### Training Sessions (`TRAINING` type)
- ✅ Already working correctly
- Logs embedding token usage during document training
- Tracks total tokens used across all chunks

## Testing

To verify token usage is being logged:

1. **Test the table structure:**
   ```bash
   node check-usage-logs-table.js
   ```

2. **Use the playground:**
   - Go to Dashboard → Playground
   - Send a message using RAG
   - Token usage should be logged automatically

3. **Check the logs:**
   ```bash
   node test-usage-logging.js
   ```

4. **Query the database:**
   ```sql
   SELECT 
     type,
     provider,
     model,
     inputTokens,
     outputTokens,
     totalTokens,
     metadata->>'source' as source,
     createdAt
   FROM usage_logs
   ORDER BY createdAt DESC
   LIMIT 10;
   ```

## Files Modified

1. ✅ `src/lib/rag-chatbot.ts`
   - Updated `generateWithLLM()` return type to include usage
   - Modified `generateWithGemini()` to extract actual token usage
   - Changed response usage to use actual tokens instead of estimates

2. ✅ `src/app/api/rag/chat/route.ts`
   - Removed `body.internal === true` condition
   - Updated to log all RAG requests
   - Added source metadata (webhook vs playground)
   - Handle missing provider config

## Next Steps

- Token usage is now being recorded for all RAG interactions
- You can build analytics dashboards using the `usage_logs` table
- The logs include metadata to distinguish between different sources
- Training token usage was already working and continues to work

## Verification

Run these commands to verify everything is working:

```bash
# Check table exists and has data
node check-usage-logs-table.js

# Test logging functionality
node test-usage-logging.js
```

Then try using the playground and check if new logs appear with `source: 'playground'` in the metadata.

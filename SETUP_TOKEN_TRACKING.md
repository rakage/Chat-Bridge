# Setup Guide: Token Usage Tracking Feature

## ✅ Implementation Complete!

The token usage tracking feature has been successfully implemented. Here's what you need to do to get it running:

## 🚀 Quick Start

### Step 1: Apply Database Migration

The `usage_logs` table needs to be created in your database. Choose one of these methods:

#### Option A: Using Prisma (Recommended)
```bash
npx prisma db push
```

#### Option B: Using SQL directly
```bash
# Copy the SQL content from prisma/migrations/add_usage_logs.sql
# Then run it in your Supabase SQL Editor or via psql
```

The SQL to run:
```sql
-- Add UsageType enum (if not exists)
DO $$ BEGIN
    CREATE TYPE "UsageType" AS ENUM ('TRAINING', 'AUTO_RESPONSE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS "usage_logs" (
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
CREATE INDEX IF NOT EXISTS "usage_logs_companyId_createdAt_idx" ON "usage_logs"("companyId", "createdAt");
CREATE INDEX IF NOT EXISTS "usage_logs_companyId_type_idx" ON "usage_logs"("companyId", "type");
CREATE INDEX IF NOT EXISTS "usage_logs_createdAt_idx" ON "usage_logs"("createdAt");

-- Add foreign key constraint
DO $$ BEGIN
    ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_companyId_fkey" 
    FOREIGN KEY ("companyId") REFERENCES "companies"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
```

### Step 2: Restart Your Application
```bash
npm run dev
# or for production
npm run build && npm start
```

### Step 3: Access the Feature
Navigate to: **`/dashboard/llm-config`**

You'll see a new section: **"Token Usage History"** with:
- 3 statistics cards (Total, Training, Auto-Response)
- Filter tabs (All, Training, Auto-Response)
- Detailed usage table

## 🎯 How to Test

### Test 1: Training Token Logging
1. Go to `/dashboard/training`
2. Upload and train some documents
3. Go to `/dashboard/llm-config`
4. Scroll to "Token Usage History"
5. Click "Training" tab
6. You should see the training session logs

### Test 2: Auto-Response Token Logging
1. Enable auto-bot for any integration (Facebook, Instagram, Telegram, or Widget)
2. Send a test message from a customer
3. Wait for the auto-bot to respond
4. Go to `/dashboard/llm-config`
5. Click "Auto-Response" tab
6. You should see the auto-response logs

### Test 3: API Endpoint
```bash
# Test the API directly
curl http://localhost:3000/api/usage-logs

# With authentication cookie from browser
curl http://localhost:3000/api/usage-logs \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

## 📊 What You'll See

### Statistics Cards
- **Total Tokens**: Overall token consumption across all operations
- **Training**: Tokens used for document embeddings
- **Auto-Response**: Tokens used by AI auto-bot responses

### Usage Table Columns
- **Type**: Badge showing TRAINING or AUTO_RESPONSE
- **Provider**: OpenAI or Gemini logo + name
- **Model**: The specific model used (e.g., gpt-3.5-turbo, text-embedding-3-small)
- **Input Tokens**: Tokens in the input/prompt
- **Output Tokens**: Tokens in the generated response
- **Total Tokens**: Sum of input + output
- **Date**: When the operation occurred

## 🔧 Troubleshooting

### Issue: Table doesn't exist
**Error**: `relation "usage_logs" does not exist`

**Solution**: Run the database migration (Step 1 above)

### Issue: No logs showing
**Possible causes**:
1. No training or auto-response has occurred yet
2. Migration not applied
3. Company not properly linked

**Solution**: 
- Try training a document first
- Check browser console for errors
- Verify migration was applied

### Issue: Filter not working
**Solution**: Clear browser cache and reload

## 📁 Files Modified/Created

### Modified Files:
- ✅ `src/app/api/rag/chat/route.ts` - Added auto-response token logging
- ✅ `src/app/dashboard/llm-config/page.tsx` - Added usage history UI
- ✅ `prisma/schema.prisma` - UsageLog model (already existed)
- ✅ `src/app/api/training/train/route.ts` - Already had training token logging

### New Files:
- ✅ `src/app/api/usage-logs/route.ts` - API endpoint to fetch logs
- ✅ `prisma/migrations/add_usage_logs.sql` - Database migration
- ✅ `TOKEN_USAGE_TRACKING_FEATURE.md` - Feature documentation
- ✅ `SETUP_TOKEN_TRACKING.md` - This setup guide

## 🎨 UI Features

### Responsive Design
- Mobile-friendly statistics cards
- Scrollable table on small screens
- Proper spacing and typography

### Loading States
- Spinner while fetching data
- Skeleton loaders for initial page load
- Empty state with helpful message

### Interactive Elements
- Tab switching (All/Training/Auto-Response)
- Hover effects on table rows
- Color-coded badges

## 💡 Pro Tips

1. **Monitor regularly**: Check usage weekly to optimize costs
2. **Use filters**: Separate training from auto-response to see patterns
3. **Check metadata**: Click into database to see detailed context
4. **Export data**: Use the API endpoint to export logs for analysis

## 🔜 Next Steps

After testing the feature, you might want to:

1. **Add export functionality** - Download logs as CSV
2. **Add date range filters** - Filter by specific time periods
3. **Add charts** - Visualize trends over time
4. **Add cost calculation** - Estimate costs based on provider pricing
5. **Add alerts** - Get notified when usage exceeds threshold

## 📝 Notes

- Token logging is fail-safe: If logging fails, the operation still completes
- All logs are company-scoped (multi-tenant safe)
- Logs are sorted by most recent first
- Pagination is ready (50 logs per page)
- Statistics are aggregated in real-time

## ❓ Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check the server logs for backend errors
3. Verify the database migration was applied successfully
4. Test the API endpoint directly with curl

---

**Status**: ✅ Ready to use after applying database migration
**Version**: 1.0
**Last Updated**: 2025-11-02

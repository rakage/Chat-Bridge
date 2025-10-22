# Widget Auto-Bot Toggle Not Working - Troubleshooting Guide

## Problem
The "AI Auto-Response" toggle in the Chat Widget settings page doesn't do anything.

## Root Cause
The most likely cause is that **the database migration hasn't been applied yet**, so the `autoBot` column doesn't exist in the `widget_configs` table.

## Solution

### Step 1: Apply the Migration

```bash
cd "D:\Raka\salsation\Web\Facebook Bot Dashboard ODL"
npx prisma migrate dev --name add_integration_autobot
npx prisma generate
```

### Step 2: Verify the Column Exists

```sql
-- Check if autoBot column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'widget_configs' AND column_name = 'autoBot';
```

Expected result:
```
column_name | data_type | column_default
------------|-----------|----------------
autoBot     | boolean   | false
```

### Step 3: Restart Your Development Server

```bash
# Stop the current server (Ctrl+C)
# Then restart
npm run dev
```

### Step 4: Test the Toggle

1. Go to Dashboard → Chat Widget
2. Find "AI Auto-Response" toggle (below "Widget Enabled")
3. Toggle it ON
4. Click "Save Changes" button at the bottom
5. Check console logs - should see: `✅ Widget config updated for company [ID] { autoBot: true, enabled: true }`

## How It Works

### Widget Config Save Flow
Unlike Facebook/Instagram/Telegram which have dedicated autobot endpoints:
```
Facebook: PATCH /api/settings/page/[pageId]/autobot
Instagram: PATCH /api/instagram/connections/[id]/autobot  
Telegram: PATCH /api/telegram/connections/[id]/autobot
```

The Widget uses the general config save endpoint:
```
Widget: PUT /api/widget/config (saves all config including autoBot)
```

### UI Flow
1. User toggles "AI Auto-Response" switch
2. `updateConfig('autoBot', checked)` updates local state
3. User clicks "Save Changes" button
4. `saveConfig()` function sends PUT request to `/api/widget/config`
5. Request includes all config fields including `autoBot`
6. Backend validates with Zod schema
7. Database updates via Prisma `upsert`
8. Success toast appears

### What Was Updated

**API Endpoint** (`src/app/api/widget/config/route.ts`):
- ✅ Added Zod validation schema
- ✅ Added `autoBot: z.boolean().optional()` to schema
- ✅ Added logging to show autoBot value after save
- ✅ Validates all incoming data before saving

**UI** (`src/app/dashboard/chat-widget/page.tsx`):
- ✅ Added toggle switch for autoBot
- ✅ Uses existing `updateConfig()` and `saveConfig()` functions
- ✅ Shows description: "Bot responds automatically to widget messages"

**Database** (`prisma/schema.prisma`):
- ✅ Added `autoBot Boolean @default(false)` to WidgetConfig model

**Widget Conversation Creation** (`src/app/api/widget/init/route.ts`):
- ✅ New conversations use `widgetConfig.autoBot` setting
- ✅ Added logging: `Created widget conversation X, autoBot: [value] (from widget setting)`

## Verification Steps

### 1. Check Database Column
```sql
SELECT * FROM widget_configs LIMIT 1;
```
Should show `autoBot` column (might be `false` by default).

### 2. Check API Response
Open browser DevTools → Network tab:
1. Go to Chat Widget settings
2. Toggle AI Auto-Response ON
3. Click "Save Changes"
4. Look for PUT request to `/api/widget/config`
5. Check Request Payload - should include `"autoBot": true`
6. Check Response - should return config with `autoBot: true`

### 3. Check Console Logs
Server console should show:
```
✅ Widget config updated for company cmxyz123 { autoBot: true, enabled: true }
```

### 4. Test New Conversation
1. Enable autoBot in widget settings
2. Save changes
3. Open your website with the widget
4. Start a new conversation
5. Server logs should show: `✅ Created widget conversation cmxyz456, autoBot: true (from widget setting)`
6. AI should auto-respond

## Common Issues

### Issue 1: Toggle doesn't save
**Symptom:** Toggle switches but reverts when page reloads

**Cause:** Migration not applied

**Fix:** Run migration:
```bash
npx prisma migrate dev --name add_integration_autobot
npx prisma generate
```

### Issue 2: API returns 400 error
**Symptom:** Error toast appears, Network tab shows 400 Bad Request

**Cause:** Validation schema issue

**Fix:** Check request payload, ensure autoBot is boolean (not string)

### Issue 3: autoBot field not in response
**Symptom:** GET response doesn't include autoBot field

**Cause:** 
- Column doesn't exist in database, OR
- Prisma client not regenerated

**Fix:**
```bash
npx prisma generate
```

### Issue 4: AI still doesn't respond
**Symptom:** Toggle works, saves correctly, but AI doesn't auto-respond

**Cause:** Check these in order:
1. Widget conversation might be old (created before toggle was enabled)
2. LLM provider not configured
3. RAG/embeddings not set up

**Fix:**
- Create a NEW widget conversation after enabling autoBot
- Check LLM config in Dashboard → Bot Settings
- Check console logs for conversation creation

## Manual Database Check

If you want to manually verify in database:

```sql
-- Check current value
SELECT id, "companyId", "autoBot", enabled 
FROM widget_configs;

-- Manually set to true (for testing)
UPDATE widget_configs 
SET "autoBot" = true 
WHERE "companyId" = 'your-company-id';

-- Verify it was set
SELECT "autoBot" FROM widget_configs 
WHERE "companyId" = 'your-company-id';
```

## Expected Behavior After Fix

### ✅ When autoBot is ON:
1. Toggle shows ON position
2. Description says "Bot responds automatically to widget messages"
3. Saves successfully with success toast
4. New widget conversations have `autoBot: true`
5. AI auto-responds to widget messages

### ✅ When autoBot is OFF:
1. Toggle shows OFF position  
2. Description says "Bot responds automatically to widget messages" (text is static)
3. Saves successfully with success toast
4. New widget conversations have `autoBot: false`
5. Manual agent response required

## Debug Checklist

Run through this checklist:

- [ ] Migration applied (`npx prisma migrate dev`)
- [ ] Prisma client regenerated (`npx prisma generate`)
- [ ] Development server restarted
- [ ] Column exists in database (verify with SQL)
- [ ] Browser cache cleared (Ctrl+F5)
- [ ] Network tab shows PUT request with autoBot
- [ ] API response includes autoBot field
- [ ] Console shows update log message
- [ ] New conversation created to test
- [ ] Console shows conversation autoBot value

## Still Not Working?

If you've checked everything above and it still doesn't work:

1. **Check the exact error:**
   - Browser console (F12)
   - Network tab for API errors
   - Server console for backend errors

2. **Verify the request:**
   ```javascript
   // In browser console
   fetch('/api/widget/config', {
     method: 'PUT',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ autoBot: true })
   }).then(r => r.json()).then(console.log)
   ```

3. **Check database directly:**
   ```sql
   \d widget_configs  -- PostgreSQL: describe table
   ```

4. **Look for validation errors:**
   Server should log: `Widget config validation error: ...`

## Quick Fix Commands

```bash
# Full reset (if needed)
cd "D:\Raka\salsation\Web\Facebook Bot Dashboard ODL"

# Apply migration
npx prisma migrate dev --name add_integration_autobot

# Regenerate client
npx prisma generate

# Restart server
npm run dev

# In new terminal, check migration
npx prisma studio
# Navigate to widget_configs table and verify autoBot column exists
```

## Success Indicators

You'll know it's working when:
1. ✅ Toggle switch changes position when clicked
2. ✅ "Save Changes" shows success toast
3. ✅ Page reload shows toggle in saved position
4. ✅ Server logs show: `✅ Widget config updated... { autoBot: true }`
5. ✅ New conversations show: `Created widget conversation... autoBot: true`
6. ✅ AI responds to new widget messages automatically


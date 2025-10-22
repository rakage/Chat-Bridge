# Integration-Level Auto-Bot Control - Complete Implementation Guide

## Overview
This feature allows you to enable/disable AI auto-responses per social media integration (Facebook page, Instagram account, Telegram bot) instead of only per conversation.

## What's Implemented

### 1. Database Schema Changes
Added `autoBot` boolean field to:
- `page_connections` (Facebook pages)
- `instagram_connections` (Instagram accounts)  
- `telegram_connections` (Telegram bots)
- **Default value: `false` (disabled by default - manual mode)**
- Users must explicitly enable auto-bot for each integration

### 2. Webhook Handler Updates
When a new conversation is created from any webhook, the conversation's `autoBot` setting is inherited from the integration:

**Facebook (`src/lib/queue.ts`):**
```typescript
autoBot: pageConnection.autoBot, // Use page's autoBot setting
```

**Instagram (`src/lib/instagram-conversation-helper.ts`):**
```typescript
autoBot: connectionForCreation.autoBot, // Use Instagram connection's autoBot setting
```

**Telegram (`src/app/api/webhook/telegram/route.ts`):**
```typescript
autoBot: connection.autoBot, // Use bot's autoBot setting
```

### 3. API Endpoints Created

#### Facebook Page Auto-Bot Toggle
```http
PATCH /api/settings/page/[pageId]/autobot
Body: { "autoBot": true | false }
```

#### Instagram Connection Auto-Bot Toggle
```http
PATCH /api/instagram/connections/[connectionId]/autobot
Body: { "autoBot": true | false }
```

#### Telegram Connection Auto-Bot Toggle
```http
PATCH /api/telegram/connections/[connectionId]/autobot
Body: { "autoBot": true | false }
```

All endpoints:
- Require authentication
- Verify user owns the integration
- Return success message with updated autoBot status
- Log the change to console

## Migration Steps

### Step 1: Apply Database Migration

Run the Prisma migration:
```bash
npx prisma migrate dev --name add_integration_autobot
```

Or apply SQL manually:
```sql
ALTER TABLE "page_connections" ADD COLUMN "autoBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "instagram_connections" ADD COLUMN "autoBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "telegram_connections" ADD COLUMN "autoBot" BOOLEAN NOT NULL DEFAULT false;
```

Then regenerate Prisma client:
```bash
npx prisma generate
```

### Step 2: Restart Your Application
```bash
# Development
npm run dev

# Production
pm2 restart your-app
# or
npm run start
```

### Step 3: Verify Migration
Check the database:
```sql
-- Verify columns exist
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name IN ('page_connections', 'instagram_connections', 'telegram_connections') 
  AND column_name = 'autoBot';
```

## How It Works

### Flow Diagram
```
User sends message → Webhook receives → Find/Create Conversation
                                              ↓
                                    Check Integration's autoBot
                                              ↓
                        ┌─────────────────────┴─────────────────────┐
                        ↓                                           ↓
                autoBot = true                              autoBot = false
                        ↓                                           ↓
                AI responds automatically                  Manual agent response required
```

### Example Scenarios

**Scenario 1: Enable AI for Page A, Disable for Page B**
```javascript
// Enable for Page A
await fetch('/api/settings/page/PAGE_A_ID/autobot', {
  method: 'PATCH',
  body: JSON.stringify({ autoBot: true })
});

// Disable for Page B
await fetch('/api/settings/page/PAGE_B_ID/autobot', {
  method: 'PATCH',
  body: JSON.stringify({ autoBot: false })
});
```

Now:
- Messages from Page A → AI auto-responds
- Messages from Page B → Manual agent required

**Scenario 2: Disable AI for Instagram During Business Hours**
```javascript
// Disable auto-bot for Instagram connection
await fetch('/api/instagram/connections/CONNECTION_ID/autobot', {
  method: 'PATCH',
  body: JSON.stringify({ autoBot: false })
});
```

**Scenario 3: Enable AI for Telegram Support Bot**
```javascript
// Enable auto-bot for Telegram connection
await fetch('/api/telegram/connections/BOT_ID/autobot', {
  method: 'PATCH',
  body: JSON.stringify({ autoBot: true })
});
```

## UI Implementation (Next Steps)

### 1. Facebook Manage Page
Add toggle switch to each connected page:

```tsx
// src/app/dashboard/integrations/facebook/manage/page.tsx
import { Switch } from "@/components/ui/switch";

const handleAutoBotToggle = async (pageId: string, autoBot: boolean) => {
  try {
    const response = await fetch(`/api/settings/page/${pageId}/autobot`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoBot }),
    });
    
    if (response.ok) {
      toast.success(`Auto-bot ${autoBot ? 'enabled' : 'disabled'}`);
      // Refresh page list
      fetchPages();
    }
  } catch (error) {
    toast.error('Failed to toggle auto-bot');
  }
};

// In your page list component
<div className="flex items-center justify-between">
  <div>
    <h3>{page.pageName}</h3>
    <p className="text-sm text-gray-500">
      {page.autoBot ? '🤖 AI Auto-Response: ON' : '👤 Manual Response: ON'}
    </p>
  </div>
  <Switch
    checked={page.autoBot}
    onCheckedChange={(checked) => handleAutoBotToggle(page.pageId, checked)}
  />
</div>
```

### 2. Instagram Manage Page
Similar implementation for Instagram connections:

```tsx
<Switch
  checked={connection.autoBot}
  onCheckedChange={(checked) => 
    handleAutoBotToggle(connection.id, checked)
  }
/>
```

Handler:
```tsx
const handleAutoBotToggle = async (connectionId: string, autoBot: boolean) => {
  const response = await fetch(
    `/api/instagram/connections/${connectionId}/autobot`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoBot }),
    }
  );
  // Handle response...
};
```

### 3. Telegram Manage Page
Similar implementation for Telegram bots:

```tsx
<Switch
  checked={bot.autoBot}
  onCheckedChange={(checked) => 
    handleAutoBotToggle(bot.id, checked)
  }
/>
```

Handler:
```tsx
const handleAutoBotToggle = async (connectionId: string, autoBot: boolean) => {
  const response = await fetch(
    `/api/telegram/connections/${connectionId}/autobot`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ autoBot }),
    }
  );
  // Handle response...
};
```

## Testing

### Test Cases

1. **New Conversation Inherits Setting**
   - Toggle autoBot OFF for Facebook Page A
   - Send message from customer → Check conversation.autoBot = false
   - Verify AI doesn't auto-respond

2. **Existing Conversations Unaffected**
   - Change integration autoBot setting
   - Verify existing conversations keep their current autoBot setting

3. **Multi-Integration Setup**
   - FB Page A: autoBot = true
   - FB Page B: autoBot = false
   - IG Account: autoBot = true
   - Telegram Bot: autoBot = false
   - Verify each works independently

4. **API Endpoint Security**
   - Try to toggle another company's integration → Should get 403
   - Try without authentication → Should get 401

### Manual Testing Script

```bash
# 1. Disable auto-bot for a Facebook page
curl -X PATCH http://localhost:3000/api/settings/page/YOUR_PAGE_ID/autobot \
  -H "Content-Type: application/json" \
  -d '{"autoBot": false}' \
  -H "Cookie: your-session-cookie"

# 2. Send test message from Facebook
# → Verify conversation created with autoBot = false
# → Verify no AI auto-response

# 3. Enable auto-bot
curl -X PATCH http://localhost:3000/api/settings/page/YOUR_PAGE_ID/autobot \
  -H "Content-Type: application/json" \
  -d '{"autoBot": true}' \
  -H "Cookie: your-session-cookie"

# 4. Send another test message
# → Verify conversation created with autoBot = true
# → Verify AI auto-responds
```

## Logging

When a conversation is created, you'll see logs like:
```
✅ Created conversation cmxyz123, autoBot: true (from page setting)
✅ Created conversation cmxyz456, autoBot: false (from bot setting)
```

When toggling autoBot:
```
✅ Updated autoBot for Facebook page My Business Page (123456) to false
✅ Updated autoBot for Instagram @myaccount (conn_xyz) to true
✅ Updated autoBot for Telegram bot @mybot (bot_abc) to false
```

## Important Notes

1. **Default Behavior**: All integrations will have `autoBot = false` (manual mode) after migration
2. **Action Required**: You must explicitly enable auto-bot for integrations where you want AI to respond
3. **Per-Conversation Override**: Users can still toggle autoBot per conversation in the conversation view
4. **New Conversations Only**: Changing integration autoBot only affects NEW conversations
5. **Manual Mode**: By default, all new conversations require manual agent responses until you enable auto-bot

## Rollback Plan

If you need to rollback:

```sql
-- Remove columns
ALTER TABLE "page_connections" DROP COLUMN "autoBot";
ALTER TABLE "instagram_connections" DROP COLUMN "autoBot";
ALTER TABLE "telegram_connections" DROP COLUMN "autoBot";
```

Then revert code changes and regenerate Prisma client:
```bash
git revert <commit-hash>
npx prisma generate
```

## Support

For issues or questions:
1. Check logs for error messages
2. Verify database migration applied correctly
3. Ensure Prisma client was regenerated
4. Test API endpoints with curl/Postman

## Future Enhancements

Potential improvements:
- Bulk toggle for multiple integrations
- Schedule auto-bot (enable during off-hours)
- Auto-bot rules based on keywords/tags
- Integration-level custom prompts
- Analytics dashboard for auto-bot usage per integration

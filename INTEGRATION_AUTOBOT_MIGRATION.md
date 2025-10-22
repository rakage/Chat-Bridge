# Integration-Level Auto-Bot Migration Guide

## Overview
This migration adds per-integration auto-bot control, allowing you to enable/disable AI auto-responses for each Facebook page, Instagram account, and Telegram bot independently.

## What's New
- Added `autoBot` boolean field to:
  - `page_connections` (Facebook pages)
  - `instagram_connections` (Instagram accounts)
  - `telegram_connections` (Telegram bots)
  - `widget_configs` (Chat widget)
- Default value: `false` (disabled by default - manual mode)
- **Important**: All integrations will default to manual mode. You must explicitly enable auto-bot for each integration you want AI to handle.

## Migration Steps

### Option 1: Using Prisma Migrate (Recommended)
```bash
# Generate and apply migration
npx prisma migrate dev --name add_integration_autobot

# Or if in production
npx prisma migrate deploy
```

### Option 2: Manual SQL Execution
If you prefer to run the SQL manually:

```sql
-- Run this SQL script on your database
ALTER TABLE "page_connections" ADD COLUMN "autoBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "instagram_connections" ADD COLUMN "autoBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "telegram_connections" ADD COLUMN "autoBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "widget_configs" ADD COLUMN "autoBot" BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN "page_connections"."autoBot" IS 'Controls whether AI auto-responds to messages from this Facebook page (default: false - manual mode)';
COMMENT ON COLUMN "instagram_connections"."autoBot" IS 'Controls whether AI auto-responds to messages from this Instagram account (default: false - manual mode)';
COMMENT ON COLUMN "telegram_connections"."autoBot" IS 'Controls whether AI auto-responds to messages from this Telegram bot (default: false - manual mode)';
COMMENT ON COLUMN "widget_configs"."autoBot" IS 'Controls whether AI auto-responds to messages from the chat widget (default: false - manual mode)';
```

Then update Prisma client:
```bash
npx prisma generate
```

## Verification
After migration, verify the columns were added:

```sql
-- Check page_connections
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'page_connections' AND column_name = 'autoBot';

-- Check instagram_connections
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'instagram_connections' AND column_name = 'autoBot';

-- Check telegram_connections
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'telegram_connections' AND column_name = 'autoBot';

-- Check widget_configs
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'widget_configs' AND column_name = 'autoBot';
```

## How It Works

### Before Migration
- Auto-bot setting was only controlled at the conversation level
- No way to disable AI for specific pages/accounts globally

### After Migration
- Each integration has its own `autoBot` toggle (default: OFF/false)
- When a new conversation is created from a webhook:
  1. System checks the integration's `autoBot` setting
  2. If `true`, the conversation's `autoBot` is enabled (AI responds)
  3. If `false` (default), the conversation's `autoBot` is disabled (manual only)
- Users must explicitly enable auto-bot for integrations they want AI to handle
- Users can toggle this in the manage pages UI

## API Changes

### New Endpoint: Toggle Integration Auto-Bot
```typescript
// Facebook Page
PATCH /api/settings/page/[pageId]/autobot
Body: { autoBot: boolean }

// Instagram Connection
PATCH /api/instagram/connections/[connectionId]/autobot
Body: { autoBot: boolean }

// Telegram Connection
PATCH /api/telegram/connections/[connectionId]/autobot
Body: { autoBot: boolean }

// Chat Widget
PATCH /api/widget/config/autobot
Body: { autoBot: boolean }
```

## UI Changes
- Facebook Manage Page: Shows toggle switch for each connected page
- Instagram Manage Page: Shows toggle switch for each connected account
- Telegram Manage Page: Shows toggle switch for each connected bot
- Chat Widget Settings: Shows toggle switch for the widget

## Rollback
If you need to rollback this migration:

```sql
ALTER TABLE "page_connections" DROP COLUMN "autoBot";
ALTER TABLE "instagram_connections" DROP COLUMN "autoBot";
ALTER TABLE "telegram_connections" DROP COLUMN "autoBot";
ALTER TABLE "widget_configs" DROP COLUMN "autoBot";
```

Then revert the schema changes and regenerate Prisma client:
```bash
npx prisma generate
```

## Notes
- **Default is `false` (manual mode) - you must explicitly enable AI for each integration**
- This setting applies to NEW conversations from the integration
- Existing conversations keep their current `autoBot` setting
- You can still toggle `autoBot` per conversation in the conversation view
- After migration, all integrations will default to manual mode until you enable auto-bot

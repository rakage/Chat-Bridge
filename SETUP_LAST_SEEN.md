# Setup Last Seen Feature with Prisma

## Steps to Complete the Migration

### 1. Stop your development server
Press `Ctrl+C` to stop the Next.js dev server if it's running (REQUIRED for prisma generate to work).

### 2. Apply the database migration ✅ (DONE)
Run the SQL migration file in your Supabase SQL Editor:
```sql
-- Copy and paste the contents of: prisma/migrations/add_conversation_last_seen.sql
```

### 3. Generate Prisma Client (CRITICAL - DO THIS NOW)
This will update the Prisma Client to include the new `ConversationLastSeen` model:
```bash
npx prisma generate
```

**Note:** This will FAIL if your dev server is still running. Make sure to stop it first!

### 4. Add code to update last seen on conversation view
In file `src\app\api\conversations\[id]\route.ts`, around line 95, ADD this code BEFORE the return statement:

```typescript
    // Update last seen timestamp when conversation is viewed
    try {
      await LastSeenService.updateLastSeen(session.user.id, conversationId, new Date());
    } catch (error) {
      console.error("Failed to update last seen on conversation view:", error);
    }

    return NextResponse.json({
      conversation: transformedConversation,
      messages: transformedMessages,
    });
```

### 5. Start your development server
```bash
npm run dev
```

### 6. Test the feature
1. Open a conversation - it should mark as read
2. Refresh the page - the conversation should stay marked as read
3. Check the database table `conversation_last_seen` - you should see records being created

## What Changed

- ✅ Added `ConversationLastSeen` model to Prisma schema
- ✅ Created new `LastSeenService` in `src/lib/last-seen.ts` using Prisma
- ✅ Updated all imports to use the new service
- ✅ Removed Supabase RLS dependency for last seen functionality

## Features

The last seen functionality now:
- Uses Prisma/PostgreSQL instead of Supabase RPC functions
- No longer requires RLS policies
- Has better error handling
- Tracks when users last viewed each conversation for unread badges

## Troubleshooting

If you get "conversationLastSeen is not defined" error:
1. Make sure you ran `npx prisma generate`
2. Restart your dev server
3. Check that the database table was created successfully

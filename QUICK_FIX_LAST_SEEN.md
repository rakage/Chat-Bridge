# Quick Fix: Last Seen Error

## The Error You're Seeing:
```
❌ Failed to fetch last seen data: Error: PrismaClient is unable to run in this browser environment
```

## Why It Happens:
Prisma can't run in the browser - it needs to run on the server.

## The Fix (3 Steps):

### 1. Stop Your Dev Server
```bash
Press Ctrl+C
```

### 2. Generate Prisma Client
```bash
npx prisma generate
```

**Note:** This MUST be done with dev server stopped, or it will fail with "EPERM" error.

### 3. Start Dev Server Again
```bash
npm run dev
```

## That's It!

The error should be gone. The code has been updated to use API endpoints instead of calling Prisma directly from the browser.

## Test It Works:
1. Open a conversation
2. Check browser console - should see: `✅ Updated database last_seen for conversation {id}`
3. Refresh the page - conversation should stay marked as read

## Still Having Issues?

See `FIX_LAST_SEEN_UNREAD.md` or `LAST_SEEN_MIGRATION_COMPLETE.md` for detailed troubleshooting.

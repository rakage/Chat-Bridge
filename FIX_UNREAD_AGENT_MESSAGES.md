# Fix: Don't Show Agent/Bot Replies as Unread

## Problem
When an agent or AI bot replies to a customer, the conversation was still showing as "unread" for the agent, which doesn't make sense - agents shouldn't see their own replies as unread.

## Solution ✅

Updated the unread count logic in `src/app/api/conversations/route.ts` to only show a conversation as unread if the **last message is from the customer (USER role)**.

### Logic Flow:

1. **Check last message role:**
   - If last message is from `AGENT` or `BOT` → `unreadCount = 0`
   - If last message is from `USER` (customer) → proceed to check if seen

2. **For customer messages, check if seen:**
   - If agent has seen it (lastSeenAt > lastMessageAt) → `unreadCount = 0`
   - If agent hasn't seen it → `unreadCount = 1`
   - If never opened → `unreadCount = min(messageCount, 5)`

### Code Changes:

#### Backend (`src/app/api/conversations/route.ts`):

**Before:**
```typescript
// Always checked if there were new messages, regardless of who sent them
if (lastMessageTime > supabaseLastSeen) {
  unreadCount = 1;
}
```

**After:**
```typescript
// Only show as unread if last message is from customer
const isLastMessageFromCustomer = lastMessage?.role === 'USER';

if (!isLastMessageFromCustomer) {
  unreadCount = 0; // Agent/bot message - not unread for agents
} else {
  // Customer message - check if seen
  if (lastMessageTime > supabaseLastSeen) {
    unreadCount = 1;
  }
}
```

#### Frontend (`src/components/realtime/ConversationsList.tsx`):

**Before:**
```typescript
// Frontend was overriding backend logic by only checking timestamps
const isUnread = !lastSeenTime || lastMessageTime > lastSeenTime;
```

**After:**
```typescript
// Frontend now also checks if last message is from customer
const isLastMessageFromCustomer = conv.lastMessage?.role === 'USER';
const isUnread = isLastMessageFromCustomer && (!lastSeenTime || lastMessageTime > lastSeenTime);
```

## Files Modified:

- ✅ `src/app/api/conversations/route.ts` - Updated backend unread calculation logic
- ✅ `src/components/realtime/ConversationsList.tsx` - Updated frontend unread calculation logic
- ✅ `src/app/api/conversations/route.ts.backup` - Backup of original file

## How to Test:

1. **Open a conversation with an unread customer message**
   - Should show unread badge ✅

2. **Reply to the customer as an agent**
   - Unread badge should disappear immediately ✅
   - Conversation should no longer show as unread in the list ✅

3. **Let the AI bot reply to a customer**
   - Bot's reply should not create an unread badge ✅

4. **Customer sends a new message**
   - Unread badge should appear again ✅

## Expected Behavior:

### ✅ Shows as Unread:
- Customer sends a new message
- Customer sends a message and agent hasn't opened the conversation yet

### ❌ Does NOT Show as Unread:
- Agent replies to customer
- Bot replies to customer
- Agent views the conversation (marks as read)

## Backup:

If you need to revert, the original file is saved as:
```
src/app/api/conversations/route.ts.backup
```

## Status: ✅ COMPLETE

The fix is applied and ready to test!

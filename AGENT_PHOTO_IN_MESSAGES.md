# Agent Photo and Name in Messages - Implementation Guide

## Overview
This feature displays the agent's name and profile photo in the ConversationView when an agent replies to a customer, providing better context and personalization in conversations.

## Changes Implemented

### 1. API Update - Store Agent Photo in Message Meta ✅

**File**: `src/app/api/messages/send/route.ts`

**What was changed**: Added agent's photo URL to message metadata when creating agent messages.

```typescript
// Get agent's photo URL
const agent = await db.user.findUnique({
  where: { id: session.user.id },
  select: { photoUrl: true },
});

// Create agent message
const message = await db.message.create({
  data: {
    conversationId,
    role: "AGENT",
    text: text.trim(),
    meta: {
      agentId: session.user.id,
      agentName: session.user.name,
      agentPhoto: agent?.photoUrl || null, // ← NEW
      sentAt: new Date().toISOString(),
    },
  },
});
```

### 2. ConversationView Update - Display Agent Info ⚠️ MANUAL EDIT REQUIRED

**File**: `src/components/realtime/ConversationView.tsx`

#### Step 1: Import Avatar Component (Line ~10) ✅ DONE

Already added:
```typescript
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
```

#### Step 2: Update Message Rendering (Line ~810)

Open the file in your editor and navigate to **line 810** where you'll find:

```typescript
              {messages.map((message) => {
                const isCustomer = message.role === "USER";
```

**CHANGE THIS LINE TO:**

```typescript
              {messages.map((message) => {
                const isCustomer = message.role === "USER";
                const isAgent = message.role === "AGENT";
                const agentName = message.meta?.agentName;
                const agentPhoto = message.meta?.agentPhoto;
```

#### Step 3: Add Agent Name Above Message Bubble (Line ~827)

Find the comment `{/* Message bubble */}` and the div that follows. 

**Before the `<div className={...rounded-lg...}>` that contains the message text**, add:

```typescript
                      {/* Agent name above message bubble (right side) */}
                      {isAgent && agentName && (
                        <span className="text-xs text-gray-600 mb-1 mr-1">
                          {agentName}
                        </span>
                      )}
```

So it looks like:
```typescript
                    <div className={`flex flex-col max-w-xs lg:max-w-md ${!isCustomer ? "items-end" : ""}`}>
                      {/* Agent name above message bubble (right side) */}
                      {isAgent && agentName && (
                        <span className="text-xs text-gray-600 mb-1 mr-1">
                          {agentName}
                        </span>
                      )}
                      
                      <div
                        className={`p-3 rounded-lg ${getMessageBgColor(
                          message.role
                        )}`}
                      >
                        <p className="text-sm">{message.text}</p>
                      </div>
                      ...
```

#### Step 4: Replace Icon with Avatar for Agent Messages (Line ~850)

Find the section with comment `{/* Icon on right for agent/bot */}`:

**REPLACE THIS:**
```typescript
                    {/* Icon on right for agent/bot */}
                    {!isCustomer && (
                      <div className="flex-shrink-0 mt-1">
                        {getMessageIcon(message.role, message.meta)}
                      </div>
                    )}
```

**WITH THIS:**
```typescript
                    {/* Avatar on right for agent/bot */}
                    {!isCustomer && (
                      <div className="flex-shrink-0 mt-1">
                        {isAgent && agentPhoto ? (
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={agentPhoto} alt={agentName || "Agent"} />
                            <AvatarFallback className="bg-green-100 text-green-700 text-xs">
                              {agentName?.charAt(0).toUpperCase() || "A"}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                            {getMessageIcon(message.role, message.meta)}
                          </div>
                        )}
                      </div>
                    )}
```

## How It Works

### Message Flow:

1. **Agent sends message** → API endpoint `/api/messages/send`
2. **API fetches agent data**:
   - Gets agent's `photoUrl` from database
   - Creates message with meta containing:
     - `agentId`
     - `agentName`
     - `agentPhoto` (new)
3. **Message stored** in database with meta
4. **Real-time broadcast** via Socket.IO
5. **ConversationView receives message**
6. **UI renders**:
   - Agent name above message bubble (right side)
   - Agent photo avatar (or fallback with initials)

### UI Display:

**Customer Messages (Left Side)**:
```
👤 User Icon  [Blue bubble with message]  12:30 PM
```

**Agent Messages (Right Side)**:
```
                       John Doe
     12:35 PM  [Green bubble with message]  📷 Agent Photo
```

**Bot Messages (Right Side)**:
```
     12:36 PM  [Purple bubble with message]  🤖 Bot Icon
```

## Visual Examples

### With Agent Photo:
```
┌────────────────────────────────────────────────┐
│                            Sarah Chen          │
│               [Thank you for contacting us!]   │
│                         12:45 PM ✓          [📷]│
└────────────────────────────────────────────────┘
```

### Without Agent Photo (Fallback):
```
┌────────────────────────────────────────────────┐
│                            Mike Johnson        │
│               [I can help you with that]       │
│                         12:46 PM ✓          [M]│
└────────────────────────────────────────────────┘
```

### Customer Message:
```
┌────────────────────────────────────────────────┐
│ [👤] [I need help with my order]               │
│      12:40 PM                                  │
└────────────────────────────────────────────────┘
```

## Benefits

1. **Personalization**: Customers see who they're talking to
2. **Accountability**: Clear attribution of responses
3. **Trust**: Builds customer confidence seeing real people
4. **Professionalism**: More polished, modern chat experience
5. **Context**: Helps customers remember previous interactions

## Testing Checklist

After applying the changes, test:

- [ ] Agent messages show agent name above bubble
- [ ] Agent messages show agent photo avatar (if photo uploaded)
- [ ] Agent messages show fallback avatar with initials (if no photo)
- [ ] Customer messages still show user icon on left
- [ ] Bot messages still show bot icon on right
- [ ] Message timestamps display correctly
- [ ] Avatar loads correctly from R2/CDN
- [ ] Fallback initials work for agents without photos
- [ ] Layout doesn't break with long agent names
- [ ] Mobile responsive (test on smaller screens)

## Troubleshooting

### Agent photo not showing?
1. Check if agent has uploaded a photo in Settings
2. Verify `agentPhoto` is in message meta (check browser console)
3. Check R2 URL is accessible (try opening URL directly)
4. Verify Avatar component is imported

### Agent name not showing?
1. Check if `agentName` is in message meta
2. Verify conditional rendering: `{isAgent && agentName && ...}`
3. Check user has a name set in their profile

### Layout broken?
1. Verify all CSS classes are correct
2. Check for missing closing tags
3. Ensure Avatar component is properly installed
4. Check browser console for errors

## Files Modified

```
✅ src/app/api/messages/send/route.ts
   - Added agent photo to message meta

✅ src/components/realtime/ConversationView.tsx (imports only)
   - Added Avatar component import

⚠️  src/components/realtime/ConversationView.tsx (message rendering)
   - REQUIRES MANUAL EDIT (see instructions above)
```

## Future Enhancements

1. **Agent Status**: Show online/offline status badge
2. **Agent Role**: Display agent's role/title
3. **Typing Indicator**: Show agent name when typing
4. **Avatar Hover**: Show agent details on hover
5. **Agent Card**: Click avatar to see full agent profile
6. **Multiple Agents**: Show all agents in conversation
7. **Agent Assignment**: Show who was assigned the conversation

## Notes

- Agent photo URLs are stored in R2 (Cloudflare)
- Fallback initials use first character of agent name
- Avatar component uses Radix UI primitives
- Message meta is JSON field in database
- Changes are backward compatible (old messages without agentPhoto still work)

---

**Status**: ⚠️ Partial - Manual edits required in ConversationView.tsx
**Priority**: High
**Estimated Time**: 5-10 minutes for manual edits
**Testing**: Required after implementation

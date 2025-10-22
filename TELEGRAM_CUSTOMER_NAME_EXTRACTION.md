# How Telegram Customer Name is Extracted

## Complete Flow: From Telegram → Database → Conversation List

---

## 1. Telegram Webhook Receives Message

**File**: `src/app/api/webhook/telegram/route.ts`

When a message arrives from Telegram, it contains user information:

```typescript
{
  message: {
    from: {
      id: 7562052653,
      first_name: "John",        ← Customer's first name
      last_name: "Doe",           ← Customer's last name (optional)
      username: "rakaluth",       ← @username (optional)
      language_code: "en"
    },
    chat: {
      id: 7562052653,
      first_name: "John",
      last_name: "Doe",
      username: "rakaluth",
      type: "private"
    },
    text: "Hello bot!"
  }
}
```

---

## 2. Extract Customer Name from Telegram Data

**File**: `src/app/api/webhook/telegram/route.ts` (Lines ~81-84)

```typescript
// Get customer info from message
const customerName = message.from
  ? `${message.from.first_name}${message.from.last_name ? " " + message.from.last_name : ""}`
  : message.chat.first_name || "Unknown";
```

### Logic Breakdown:

1. **If `message.from` exists** (normal messages):
   - Take `first_name` + space + `last_name` (if exists)
   - Example: "John" + " " + "Doe" = **"John Doe"**
   - If no last name: "John" = **"John"**

2. **Else** (fallback to chat info):
   - Use `message.chat.first_name`
   - Or "Unknown" if nothing available

---

## 3. Save to Database

**File**: `src/app/api/webhook/telegram/route.ts` (Lines ~86-103)

```typescript
conversation = await db.conversation.create({
  data: {
    psid: chatId,                     // Chat ID
    platform: Platform.TELEGRAM,
    telegramConnectionId: connection.id,
    status: "OPEN",
    autoBot: true,
    customerName: customerName,       // ✅ STORED HERE: "John Doe"
    lastMessageAt: new Date(),
    meta: {
      telegramUserId: userId,         // 7562052653
      username: message.from?.username || message.chat.username,  // "rakaluth"
      chatType: message.chat.type,    // "private"
      platform: "telegram",
    },
  },
});
```

**Result in Database**:
```
conversation table:
- id: "cm4abc123..."
- customerName: "John Doe"        ← Stored here
- platform: "TELEGRAM"
- meta: { username: "rakaluth", telegramUserId: "7562052653", ... }
```

---

## 4. Return in Conversation List API

**File**: `src/app/api/conversations/route.ts` (Lines ~147-151)

```typescript
// Get customer profile from metadata if available
const customerProfile = (conv.meta as any)?.customerProfile;
let customerName = customerProfile?.fullName || conv.customerName;

if (!customerName) {
  customerName = conv.psid ? `Customer ${conv.psid.slice(-4)}` : "Unknown Customer";
}
```

### Priority Order:

1. **`customerProfile?.fullName`** (from meta, if exists)
   - Used for Facebook/Instagram with fetched profiles
   - Usually empty for Telegram

2. **`conv.customerName`** ← **THIS IS USED FOR TELEGRAM**
   - Stored directly from webhook
   - Value: "John Doe"

3. **Fallback**: `Customer 2653` (last 4 digits of psid)

---

## 5. Display in Conversation List

**File**: `src/components/realtime/ConversationsList.tsx`

The API returns:
```typescript
{
  id: "cm4abc123...",
  customerName: "John Doe",         ← From database customerName field
  platform: "TELEGRAM",
  pageName: "@testchatbridge_bot",
  // ...
}
```

The UI displays:
```
┌────────────────────────────────────┐
│ [📱] John Doe                      │
│      @testchatbridge_bot           │
│      Hello bot!                    │
└────────────────────────────────────┘
```

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. TELEGRAM SENDS MESSAGE                                       │
│    { from: { first_name: "John", last_name: "Doe" } }           │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. WEBHOOK EXTRACTS NAME                                        │
│    customerName = "John" + " " + "Doe" = "John Doe"             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. SAVE TO DATABASE                                             │
│    conversation.customerName = "John Doe"                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. API QUERY                                                    │
│    SELECT customerName FROM conversation WHERE id = ...         │
│    Returns: "John Doe"                                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. DISPLAY IN UI                                                │
│    [📱] John Doe                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Comparison: Telegram vs Facebook/Instagram

### Telegram Customer Name
```typescript
✅ Direct extraction from message
✅ Stored immediately in customerName field
✅ No API call needed
✅ Available instantly in conversation list

// Webhook extracts:
customerName = message.from.first_name + " " + message.from.last_name
// Stored in: conversation.customerName
```

### Facebook/Instagram Customer Name
```typescript
⚠️ Requires separate API call to Facebook Graph API
⚠️ Fetched asynchronously
⚠️ Stored in meta.customerProfile
⚠️ May not be available immediately

// Webhook creates conversation with psid only
// Background job fetches profile from Facebook API
// Stored in: conversation.meta.customerProfile.fullName
```

---

## Why This Works Well for Telegram

1. **No External API Call**: 
   - Telegram includes user info directly in the message
   - No need to call Telegram API separately

2. **Immediate Availability**:
   - Name available as soon as message arrives
   - No async fetching or delays

3. **Simple Storage**:
   - Stored directly in `customerName` field
   - No complex profile object needed

4. **Privacy-Friendly**:
   - Only uses data Telegram already sends
   - Respects user's Telegram privacy settings

---

## Edge Cases

### 1. User with Only First Name
```typescript
// Telegram data
{ first_name: "John", last_name: undefined }

// Result
customerName = "John"  // No trailing space
```

### 2. User with No Name (rare)
```typescript
// Telegram data
{ first_name: undefined }

// Result
customerName = "Unknown"
```

### 3. Bot/Channel Messages
```typescript
// No message.from, use chat info
customerName = message.chat.first_name || "Unknown"
```

---

## Additional Info: Username vs Name

**Customer Name** (`customerName`):
- Human-readable display name
- From `first_name` + `last_name`
- Example: "John Doe"
- Always displayed in conversation list

**Username** (`meta.username`):
- Telegram @handle
- Optional (user may not have one)
- Example: "@rakaluth"
- Displayed in conversation view details

---

## Code Summary

### Extraction (Webhook)
```typescript
const customerName = message.from
  ? `${message.from.first_name}${message.from.last_name ? " " + message.from.last_name : ""}`
  : message.chat.first_name || "Unknown";
```

### Storage (Database)
```typescript
conversation = await db.conversation.create({
  data: {
    customerName: customerName,  // "John Doe"
    meta: {
      username: message.from?.username  // "rakaluth"
    }
  }
});
```

### Retrieval (List API)
```typescript
let customerName = customerProfile?.fullName || conv.customerName;
// For Telegram: uses conv.customerName → "John Doe"
```

### Display (UI)
```typescript
<div>{conversation.customerName}</div>
// Shows: "John Doe"
```

---

## Summary

**How Telegram customer name is extracted:**

1. ✅ Telegram sends `first_name` + `last_name` in message
2. ✅ Webhook concatenates: `"John" + " " + "Doe"` = `"John Doe"`
3. ✅ Stored in `conversation.customerName` field
4. ✅ Retrieved by conversation list API
5. ✅ Displayed directly in UI

**No external API calls, no async fetching, no delays - just simple, direct extraction!** 🎉

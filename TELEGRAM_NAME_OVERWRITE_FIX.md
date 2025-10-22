# Telegram Customer Name Overwrite Fix

## Issue Report

**Problem**: Customer name shows correctly for a split second, then changes to "Telegram User 2653"

**Symptom**: 
1. ConversationView loads
2. Shows "John Doe" briefly
3. Changes to "Telegram User 2653" immediately

---

## Root Cause Analysis

The issue occurs because of a race condition in the profile fetching logic:

### Timeline of Events:
```
1. [0ms] Page loads → Fetches conversation data
   → conversation.customerName = "John Doe" ✅
   → Displays "John Doe" ✅

2. [100ms] useEffect triggers → Calls fetchCustomerProfile()
   → Tries to fetch profile from API
   → API returns 404 or error (Telegram doesn't have profile API)
   → Creates fallback profile ❌

3. [200ms] Fallback profile overwrites customerName
   → fullName = "Telegram User 2653" ❌
   → setCustomerProfile({ fullName: "Telegram User 2653" })
   → UI updates to show "Telegram User 2653" ❌
```

---

## The Problem Code

**File**: `src/components/realtime/ConversationView.tsx`

### Location 1: Lines ~576-580 (Failed fetch handler)
```typescript
// BEFORE (Wrong)
if (isTelegram) {
  firstName = "Telegram User";
  fullName = `Telegram User ${conversation.psid.slice(-4)}`; // ❌ Always uses fallback
  platformUrl = undefined;
  platformName = "telegram";
}
```

### Location 2: Lines ~635-639 (Error catch handler)
```typescript
// BEFORE (Wrong)
if (isTelegram) {
  firstName = "Telegram User";
  fullName = `Telegram User ${conversation.psid.slice(-4)}`; // ❌ Always uses fallback
  platformUrl = undefined;
  platformName = "telegram";
}
```

**Problem**: Both locations create a hardcoded fallback that **ignores** the actual customer name stored in the database.

---

## The Fix

### Fix 1: Webhook Update (Lines 150-169)
**File**: `src/app/api/webhook/telegram/route.ts`

Added customer name update for existing conversations:

```typescript
// AFTER (Fixed)
} else {
  // Update last message time and customer info (in case name/username changed)
  const customerName = message.from
    ? `${message.from.first_name}${message.from.last_name ? " " + message.from.last_name : ""}`
    : message.chat.first_name || "Unknown";

  await db.conversation.update({
    where: { id: conversation.id },
    data: { 
      lastMessageAt: new Date(),
      customerName: customerName, // ✅ Update customer name
      meta: {
        ...(conversation.meta as any),
        telegramUserId: userId,
        username: message.from?.username || message.chat.username,
        chatType: message.chat.type,
      },
    },
  });
}
```

### Fix 2: Profile Fallback Logic (2 locations)
**File**: `src/components/realtime/ConversationView.tsx`

Updated fallback profile to use actual customer name:

```typescript
// AFTER (Fixed) - Location 1: Lines ~577-580
if (isTelegram) {
  // Use actual customer name from conversation if available
  firstName = conversation.customerName?.split(' ')[0] || "Telegram User";
  fullName = conversation.customerName || `Telegram User ${conversation.psid.slice(-4)}`;
  platformUrl = undefined;
  platformName = "telegram";
}

// AFTER (Fixed) - Location 2: Lines ~636-640
if (isTelegram) {
  // Use actual customer name from conversation if available
  firstName = conversation.customerName?.split(' ')[0] || "Telegram User";
  fullName = conversation.customerName || `Telegram User ${conversation.psid.slice(-4)}`;
  platformUrl = undefined;
  platformName = "telegram";
}
```

**Key Change**: Now uses `conversation.customerName` from database instead of hardcoded "Telegram User XXXX"

---

## How It Works Now

### Timeline After Fix:
```
1. [0ms] Page loads → Fetches conversation data
   → conversation.customerName = "John Doe" ✅
   → Displays "John Doe" ✅

2. [100ms] useEffect triggers → Calls fetchCustomerProfile()
   → Tries to fetch profile from API
   → API returns 404 or error

3. [200ms] Fallback profile uses conversation.customerName
   → fullName = conversation.customerName || fallback
   → fullName = "John Doe" ✅
   → setCustomerProfile({ fullName: "John Doe" })
   → UI still shows "John Doe" ✅ (no change!)
```

---

## Display Priority (Unchanged)

The display logic remains the same, but now the fallback profile has the correct data:

```typescript
// ConversationView header display priority:
1. customerProfile.fullName (with Facebook/Instagram URL) → Link
2. customerProfile?.fullName → Plain text (✅ Now has "John Doe" for Telegram)
3. conversation?.customerName → Fallback
4. "Customer XXXX" → Final fallback
```

---

## Files Modified

### 1. `src/app/api/webhook/telegram/route.ts`
**Lines**: 150-169
**Change**: Update `customerName` and `meta` when receiving messages for existing conversations
**Reason**: Ensures customer name is always up-to-date in database

### 2. `src/components/realtime/ConversationView.tsx`
**Lines**: 577-580 (first fallback)
**Lines**: 636-640 (second fallback - error catch)
**Change**: Use `conversation.customerName` instead of hardcoded "Telegram User XXXX"
**Reason**: Respect actual customer name from database

---

## Testing

### Before Fix
```
1. Open Telegram conversation
2. See "John Doe" for 0.1 seconds
3. Changes to "Telegram User 2653" ❌
```

### After Fix
```
1. Open Telegram conversation
2. See "John Doe" immediately
3. Stays as "John Doe" ✅
```

### Test Cases

**Test 1: New Telegram Message**
- Send message from Telegram
- Open conversation
- Should show: "John Doe" (from first_name + last_name)

**Test 2: Existing Conversation**
- Send another message
- Reload page
- Should show: "John Doe" (updated from webhook)

**Test 3: User with Only First Name**
- User with no last name sends message
- Should show: "John" (just first name)

**Test 4: Profile API Fails**
- API returns 404 for customer profile
- Should show: "John Doe" (from conversation.customerName)
- NOT: "Telegram User 2653"

---

## Comparison: Before vs After

### Before Fix
```
Database: customerName = "John Doe"
API Response: customerName = "John Doe", customerProfile = null
UI Initial: "John Doe" ✅
fetchCustomerProfile runs → Creates fallback
Fallback: { fullName: "Telegram User 2653" } ❌
UI Final: "Telegram User 2653" ❌
```

### After Fix
```
Database: customerName = "John Doe"
API Response: customerName = "John Doe", customerProfile = null
UI Initial: "John Doe" ✅
fetchCustomerProfile runs → Creates fallback with customerName
Fallback: { fullName: "John Doe" } ✅
UI Final: "John Doe" ✅
```

---

## Why This Happened

### Design Issue
The `fetchCustomerProfile` function was designed for Facebook/Instagram where:
1. Profile must be fetched from external API (Graph API)
2. Fallback is used when API fails
3. Fallback creates generic name like "Customer #1234"

### Telegram Difference
For Telegram:
1. Customer name comes **directly in the message** (no separate API)
2. Name is stored in `conversation.customerName` immediately
3. No need to fetch profile from external API
4. Fallback should use existing `customerName`, not create generic name

### Solution
Update fallback logic to be platform-aware:
- **Facebook/Instagram**: Use generic fallback (profile API failed)
- **Telegram**: Use `conversation.customerName` (already in database)
- **Widget**: Use `conversation.customerName` (already in database)

---

## Additional Benefits

The webhook update also:
1. ✅ Updates username if user changes it
2. ✅ Updates chat type if conversation moves to group
3. ✅ Keeps metadata in sync with latest message
4. ✅ Handles name changes (if user updates their Telegram name)

---

## Summary

**Issue**: Customer name overwritten by fallback profile creation

**Cause**: Fallback logic used hardcoded "Telegram User XXXX" instead of database `customerName`

**Fix**: Updated fallback to use `conversation.customerName` for Telegram

**Result**: Customer name displays correctly and stays consistent ✅

**Files Changed**: 
1. `src/app/api/webhook/telegram/route.ts` (update existing conversations)
2. `src/components/realtime/ConversationView.tsx` (fix fallback profile logic - 2 places)

**Test Now**: Open Telegram conversation → Should show "John Doe" and stay that way! 🎉

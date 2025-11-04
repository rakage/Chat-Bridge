# Facebook Multi-Page Webhook Architecture

## Overview

This application uses a **Chatwoot-inspired architecture** for handling Facebook webhooks from multiple pages simultaneously. This document explains how the system works and why the previous approach failed.

---

## The Problem: Webhook Truncation

### What Was Happening Before

When using the **global webhook subscription endpoint** (`/me/subscribed_apps`):

```javascript
// ❌ WRONG: Global endpoint
POST https://graph.facebook.com/v23.0/me/subscribed_apps
```

**Result:**
- Each new page subscription **overwrites** the previous one
- Only the **most recently connected page** receives webhooks
- Other pages lose webhook subscription silently
- This is Facebook's API behavior - global endpoint is truly global!

### Example Scenario

1. Connect "Dian Aul" page → Subscribes via `/me/subscribed_apps` ✅
2. Connect "Rakage" page → Subscribes via `/me/subscribed_apps` ✅
3. **Result:** Only "Rakage" receives webhooks! "Dian Aul" is unsubscribed ❌

---

## The Solution: Page-Specific Subscriptions

### Correct Approach (Chatwoot Pattern)

Use **page-specific webhook subscription endpoint** (`/{page-id}/subscribed_apps`):

```javascript
// ✅ CORRECT: Page-specific endpoint
POST https://graph.facebook.com/v23.0/{page-id}/subscribed_apps
```

**Result:**
- Each page has **independent webhook subscription**
- Multiple pages can coexist without interference
- Adding new pages doesn't affect existing pages
- Each page maintains its own subscription state

### Example Scenario

1. Connect "Dian Aul" → Subscribe via `/123456789/subscribed_apps` ✅
2. Connect "Rakage" → Subscribe via `/987654321/subscribed_apps` ✅
3. **Result:** BOTH pages receive webhooks simultaneously! ✅

---

## Architecture Components

### 1. **Webhook Subscription** (`src/lib/facebook.ts`)

```typescript
async subscribePageToWebhook(
  pageId: string,              // ← Page-specific!
  pageAccessToken: string,
  subscribedFields: string[]
): Promise<{ success: boolean }> {
  const url = `https://graph.facebook.com/v23.0/${pageId}/subscribed_apps`;
  // Each page subscribes independently
}
```

**Key Points:**
- First parameter is `pageId` (not optional!)
- Uses page's own access token
- Creates independent subscription per page

---

### 2. **Webhook Processing** (`src/lib/facebook-webhook-processor.ts`)

Inspired by Chatwoot's message routing pattern:

```typescript
// Extract page ID from webhook payload
const pageId = entry.id;  // ← Facebook tells us which page received the message

// Dynamic token lookup (no global tokens!)
const pageConnection = await db.pageConnection.findUnique({
  where: { pageId }
});

// Use page-specific access token
const accessToken = await decrypt(pageConnection.pageAccessTokenEnc);
```

**Key Features:**
1. **Dynamic Routing:** Each webhook identifies its page via `entry.id`
2. **Dynamic Token Lookup:** Retrieves correct token from database per page
3. **Redis Mutex Locks:** Prevents race conditions (Chatwoot pattern)
4. **Independent Processing:** Each page processed separately

---

### 3. **Redis Mutex Locks** (Race Condition Prevention)

```typescript
// Prevent duplicate message processing
await withMutexLock(`${senderId}:${recipientId}`, async () => {
  // Process message safely
});
```

**Why This Matters:**
- Facebook may send duplicate webhooks
- Multiple server instances may receive same webhook
- Lock ensures message processed only once per conversation

---

### 4. **Connection Flow**

```
User clicks "Connect Facebook Page"
    ↓
OAuth Flow → Get list of pages
    ↓
User selects pages to connect
    ↓
For each page:
    1. Store pageId + encrypted access token in database
    2. Subscribe THAT PAGE using /{page-id}/subscribed_apps
    3. Mark as subscribed in database
    ↓
All pages now receive webhooks independently! ✅
```

---

## Code Changes Summary

### Before (Global Endpoint - BROKEN)

```javascript
// Old: Connect OAuth route
await facebookAPI.subscribePageToWebhook(
  pageAccessToken,  // ❌ Only token, no page ID!
  fields
);

// Old: Facebook API method
async subscribePageToWebhook(
  pageAccessToken: string,
  subscribedFields: string[]
) {
  const url = `/me/subscribed_apps`;  // ❌ Global!
}
```

### After (Page-Specific - CORRECT)

```javascript
// New: Connect OAuth route
await facebookAPI.subscribePageToWebhook(
  pageData.id,      // ✅ Page ID first!
  longLivedToken,   // ✅ Token second
  fields
);

// New: Facebook API method
async subscribePageToWebhook(
  pageId: string,         // ✅ Page ID parameter!
  pageAccessToken: string,
  subscribedFields: string[]
) {
  const url = `/${pageId}/subscribed_apps`;  // ✅ Page-specific!
}
```

---

## Testing Multi-Page Setup

### 1. Run Migration Script

```bash
node resubscribe-all-pages.js
```

This will:
- Migrate all pages to use page-specific subscriptions
- Verify each subscription independently
- Update database subscription status

### 2. Verify Subscriptions

```bash
node check-all-webhook-subscriptions.js
```

Should show **all pages subscribed** ✅

### 3. Test Webhook Reception

Send test messages to **EACH** page:

1. Send message to "Dian Aul" → Check logs ✅
2. Send message to "Rakage" → Check logs ✅
3. **Both should receive webhooks!** 🎉

---

## Database Schema

```prisma
model PageConnection {
  id                  String   @id @default(cuid())
  companyId           String
  pageId              String   @unique  // ← Facebook Page ID
  pageName            String
  pageAccessTokenEnc  String   // ← Encrypted, page-specific token
  verifyTokenEnc      String
  subscribed          Boolean  @default(false)
  
  // Relations
  company             Company  @relation(...)
  conversations       Conversation[]
}
```

**Key Points:**
- Each page stored separately
- `pageId` is **unique** across entire database
- Each page has its own encrypted access token
- `subscribed` flag tracks webhook subscription status

---

## Monitoring & Maintenance

### Check Subscription Status

```javascript
// Via API
GET https://graph.facebook.com/v23.0/{page-id}/subscribed_apps
  ?access_token={page-access-token}
```

### Re-subscribe After Token Refresh

When refreshing page access tokens (e.g., after OAuth re-auth):

```typescript
// 1. Update token in database
await db.pageConnection.update({
  where: { pageId },
  data: { pageAccessTokenEnc: newEncryptedToken }
});

// 2. Re-subscribe with new token
await facebookAPI.subscribePageToWebhook(
  pageId,
  newToken,
  fields
);
```

---

## Common Issues & Solutions

### Issue: "Only one page receives webhooks"

**Cause:** Still using global `/me/subscribed_apps` endpoint somewhere

**Solution:**
1. Search codebase for `/me/subscribed_apps`
2. Replace with `/${pageId}/subscribed_apps`
3. Run `node resubscribe-all-pages.js`

### Issue: "Webhooks stop working after connecting new page"

**Cause:** New page overwrote previous subscriptions

**Solution:**
1. Verify all subscription calls use page-specific endpoint
2. Check `src/lib/facebook.ts` → `subscribePageToWebhook()` method
3. Ensure first parameter is `pageId`

### Issue: "Duplicate messages in database"

**Cause:** Race condition - webhook processed multiple times

**Solution:**
1. Verify Redis is running
2. Check Redis mutex locks are working
3. See `FacebookWebhookProcessor.withMutexLock()`

---

## References

### Chatwoot's Approach

Chatwoot (open-source customer support platform) handles this correctly:

```ruby
# Chatwoot's message routing
def create_contact_message
  Channel::FacebookPage.where(page_id: response.recipient_id).each do |page|
    # Uses page-specific token for each page
    mb = Messages::Facebook::MessageBuilder.new(response, page.inbox)
    mb.perform
  end
end
```

### Facebook Documentation

- [Facebook Webhooks for Messenger Platform](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Page Subscriptions API](https://developers.facebook.com/docs/graph-api/reference/page/subscribed_apps)

---

## Summary

✅ **Use page-specific endpoints:** `/{page-id}/subscribed_apps`  
✅ **Dynamic token lookup:** Retrieve token from DB per webhook  
✅ **Independent subscriptions:** Each page maintains its own state  
✅ **Redis mutex locks:** Prevent race conditions  
✅ **Proper routing:** Use `entry.id` to identify page in webhook  

❌ **Avoid global endpoint:** `/me/subscribed_apps` overwrites previous subscriptions  
❌ **No global tokens:** Each webhook must use its page's token  
❌ **No shared state:** Pages should not interfere with each other  

---

**Last Updated:** 2025-11-04  
**Architecture Version:** 2.0 (Chatwoot-inspired)

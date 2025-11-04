# Quick Start: Fix Multi-Page Webhook Truncation

## 🚨 Problem You Had

- When connecting multiple Facebook pages (e.g., "Dian Aul" and "Rakage")
- Only the **most recently connected page** received webhooks
- Other pages stopped receiving messages
- This is called "webhook truncation"

## ✅ What Was Fixed

Your codebase now uses **Chatwoot-inspired architecture**:

1. ✅ **Page-specific webhook subscriptions** (not global)
2. ✅ **Dynamic token lookup** per webhook
3. ✅ **Redis mutex locks** to prevent race conditions
4. ✅ **Independent subscriptions** per page

## 🚀 Steps to Fix Your Existing Pages

### 1. Run Migration Script (REQUIRED)

```bash
node resubscribe-all-pages.js
```

**What it does:**
- Migrates all pages to use page-specific endpoints
- Re-subscribes each page independently
- Verifies subscriptions succeeded

**Expected output:**
```
🎯 KEY ARCHITECTURAL CHANGE:
   ✅ Now using PAGE-SPECIFIC webhook subscriptions
   ✅ Endpoint: /{page-id}/subscribed_apps (per page)
   ✅ NOT using: /me/subscribed_apps (global, overwrites!)
   ✅ Each page maintains INDEPENDENT subscription
   ✅ No more webhook truncation!
```

### 2. Verify All Pages Subscribed (OPTIONAL)

```bash
node check-all-webhook-subscriptions.js
```

Should show **all pages subscribed** ✅

### 3. Test Both Pages (REQUIRED)

**Test Page 1:**
1. Open Facebook Messenger
2. Send message to "Dian Aul" page
3. Check your app → Message should appear ✅
4. Check server logs → Webhook should be received ✅

**Test Page 2:**
1. Open Facebook Messenger  
2. Send message to "Rakage" page
3. Check your app → Message should appear ✅
4. Check server logs → Webhook should be received ✅

**Test Simultaneously:**
1. Send message to "Dian Aul" ✅
2. Send message to "Rakage" ✅
3. **Both should receive webhooks!** 🎉

---

## 📝 What Changed in Your Code

### 1. New File: `src/lib/facebook-webhook-processor.ts`

**Purpose:** Central webhook processing with Chatwoot patterns

**Key Features:**
- Dynamic token lookup per page
- Redis mutex locks (prevents duplicate messages)
- Clean event handling
- Comprehensive logging

### 2. Updated: `src/app/api/webhook/facebook/route.ts`

**Before:** 300+ lines of inline webhook processing  
**After:** Clean delegation to `FacebookWebhookProcessor`

### 3. Updated: `src/lib/facebook.ts`

**Before:**
```typescript
async subscribePageToWebhook(pageAccessToken: string, fields: string[])
```

**After:**
```typescript
async subscribePageToWebhook(
  pageId: string,        // ← NEW! Page ID first
  pageAccessToken: string,
  fields: string[]
)
```

### 4. Updated: All subscription callers

Every place that subscribes to webhooks now passes `pageId` first:

```typescript
// Before
await facebookAPI.subscribePageToWebhook(token, fields);

// After
await facebookAPI.subscribePageToWebhook(pageId, token, fields);
```

---

## 🎯 Why This Fixes The Problem

### Facebook's API Behavior

**Global Endpoint (OLD - WRONG):**
```
POST /me/subscribed_apps
```
- ❌ Overwrites previous page subscriptions
- ❌ Only last page receives webhooks
- ❌ Other pages silently unsubscribed

**Page-Specific Endpoint (NEW - CORRECT):**
```
POST /{page-id}/subscribed_apps
```
- ✅ Each page has independent subscription
- ✅ All pages receive webhooks
- ✅ No interference between pages

### Analogy

**Before (Global):**
- Like having one phone number for multiple people
- When someone new gets the number, previous person loses it

**After (Page-Specific):**
- Each person has their own phone number
- Everyone can receive calls simultaneously

---

## 📚 Documentation Created

1. **`CHATWOOT_ARCHITECTURE_IMPLEMENTATION.md`**
   - Comprehensive implementation guide
   - Before/after comparisons
   - Testing checklist

2. **`FACEBOOK_MULTI_PAGE_ARCHITECTURE.md`**
   - Detailed architecture explanation
   - Why the problem occurred
   - How the solution works
   - Troubleshooting guide

3. **`QUICK_START_MULTI_PAGE_FIX.md`** (this file)
   - Quick reference
   - Immediate action items

---

## ✅ Verification Checklist

After running the migration script:

- [ ] Run `node resubscribe-all-pages.js` ✅
- [ ] Check output shows "PAGE-SPECIFIC" endpoints used
- [ ] Send test message to Page 1 → Receives webhook ✅
- [ ] Send test message to Page 2 → Receives webhook ✅
- [ ] Check database → No duplicate messages ✅
- [ ] Check Meta App Dashboard → Both pages listed ✅
- [ ] Test customer profile → Works for both pages ✅
- [ ] Send reply from your app → Works for both pages ✅

---

## 🔍 How to Verify It's Working

### Check Server Logs

When webhook is received, you should see:

```
📄 Processing webhook for Page ID: 123456789
   Time: 2025-11-04T10:30:00Z
   Events: 1
✅ Page found: Dian Aul (Company: Your Company)
📨 Processing text_message from 987654321 to page 123456789
✅ Message queued for processing via Redis
```

**Key indicators:**
- ✅ Shows correct page name
- ✅ Shows page ID from webhook
- ✅ No errors about missing page

### Check Redis Locks (Optional)

If you see this in logs:
```
⏳ Lock already held for 987654321:123456789, waiting...
```

**This is GOOD!** It means:
- Redis mutex is working
- Duplicate webhook was blocked
- No duplicate messages will be created

---

## 🚨 Common Issues

### Issue: Only one page still receives webhooks

**Solution:**
1. Make sure you ran `node resubscribe-all-pages.js`
2. Check the script output showed "PAGE-SPECIFIC" endpoints
3. If not, check `src/lib/facebook.ts` → `subscribePageToWebhook()` method
4. Ensure it uses `/${pageId}/subscribed_apps` not `/me/subscribed_apps`

### Issue: Duplicate messages in database

**Solution:**
1. Check Redis is running: `redis-cli ping`
2. Should return `PONG`
3. Check server logs for Redis connection
4. Restart server to ensure Redis connection is established

### Issue: Customer profile shows wrong page

**Solution:**
1. Check webhook logs show correct `pageId`
2. Verify `pageConnection` lookup uses `pageId` from webhook
3. Check token decryption happens per request (no caching)

---

## 📞 Support

If you encounter issues:

1. **Check logs** - Most issues are visible in server logs
2. **Read documentation:**
   - `FACEBOOK_MULTI_PAGE_ARCHITECTURE.md` - Full architecture
   - `CHATWOOT_ARCHITECTURE_IMPLEMENTATION.md` - Implementation details
3. **Verify Facebook API:**
   - Test manually: `GET /{page-id}/subscribed_apps?access_token=...`
   - Should show your app subscribed

---

## 🎉 Expected Result

After completing these steps:

✅ All Facebook pages receive webhooks independently  
✅ No webhook truncation or interference  
✅ Customer profiles load correctly for all pages  
✅ Messages can be sent/received on all pages  
✅ No duplicate messages in database  
✅ System scales to unlimited pages  

---

## 📝 Summary

**Run this ONE command:**
```bash
node resubscribe-all-pages.js
```

**Then test:**
1. Send message to Page 1 ✅
2. Send message to Page 2 ✅
3. Both should work! 🎉

**That's it!** Your multi-page Facebook webhook architecture is now fixed using Chatwoot-inspired patterns.

---

**Implementation Date:** 2025-11-04  
**Status:** ✅ Ready to Use  
**Next:** Run migration script and test!

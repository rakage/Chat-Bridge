# Customer Info Testing Guide

## Overview
This guide helps you test the customer info fixes for Instagram and Chat Widget conversations.

## Prerequisites
- Server running: `npm run dev` or `node server.js`
- Database accessible
- At least one Facebook/Instagram/Widget integration configured

## Test 1: Chat Widget Customer Info

### Setup:
1. Ensure Chat Widget is configured in `/dashboard/chat-widget`
2. Get your company ID from the widget config

### Steps:
1. **Open Widget Demo Page**
   ```
   http://localhost:3001/widget-demo.html
   ```

2. **Fill Out Initial Form**
   - Name: "John Doe"
   - Email: "john.doe@example.com"
   - Message: "Hi, I need help with my order"
   - Click "Start Chat"

3. **Open Dashboard**
   ```
   http://localhost:3001/dashboard/conversations
   ```

4. **Select the Conversation**
   - Find the new conversation from "John Doe"
   - Click to open it

5. **Open Customer Info Sidebar**
   - Click "Customer Info" button (Info icon) in top right

### Expected Results:

✅ **Profile Section:**
- Name displays: "John Doe"
- Platform badge shows: "Website"
- Email displays: "john.doe@example.com" (clickable mailto link)
- No Facebook or Instagram profile links

✅ **Contact Info Section:**
- Email field pre-filled: "john.doe@example.com"
- Phone field: Empty (can be edited)
- Address field: Empty (can be edited)
- All fields are editable

### Test Variations:

**Test 2a: Widget Without Email**
- Fill form with only name and message (no email)
- Expected: Name shows, no email in profile, email field is empty and editable

**Test 2b: Widget With Phone**
- After initial form, edit contact info to add phone
- Expected: Phone saves and displays correctly

**Test 2c: Widget Anonymous**
- Submit form with minimal info
- Expected: Shows "Website Visitor #XXXX", all fields editable

---

## Test 2: Instagram Customer Info

### Setup:
1. Ensure Instagram Business Account is connected
2. Have Instagram app on your phone or use Instagram web

### Steps:
1. **Send Instagram Message**
   - Open Instagram app
   - Find your business account
   - Send a DM: "Hello from Instagram"

2. **Check Webhook**
   - Watch server console for:
     ```
     📥 Instagram webhook event received
     💬 New Instagram message from [SENDER_ID]
     ```

3. **Open Dashboard**
   ```
   http://localhost:3001/dashboard/conversations
   ```

4. **Select Instagram Conversation**
   - Should show new Instagram conversation
   - Click to open

5. **Open Customer Info Sidebar**
   - Click "Customer Info" button

### Expected Results:

✅ **Profile Section:**
- Name displays: "@your_instagram_username" or "ig_user_XXXX"
- Platform badge shows: "Instagram"
- Instagram Profile link appears (Instagram DM URL)
- No Facebook profile link

✅ **Contact Info Section:**
- Email field: Empty (can be added)
- Phone field: Empty (can be added)
- Address field: Empty (can be added)
- All fields are editable

### Test Variations:

**Test 2a: Add Email to Instagram User**
1. Click on email field in Contact Info
2. Enter: "instagram.user@example.com"
3. Press Enter or click Save
4. Expected: Email saves and appears in both profile and contact sections

**Test 2b: Multiple Instagram Messages**
1. Send multiple messages from same Instagram account
2. Expected: All messages go to same conversation, profile stays consistent

---

## Test 3: Facebook Messenger Customer Info

### Setup:
1. Ensure Facebook Page is connected
2. Have Facebook Messenger app or Facebook.com access

### Steps:
1. **Send Facebook Message**
   - Open Facebook Messenger
   - Message your connected page
   - Send: "Hello from Facebook"

2. **Check Webhook**
   - Watch server console for:
     ```
     📥 Facebook webhook event received
     💬 New Facebook message from [PSID]
     ```

3. **Open Dashboard**
   ```
   http://localhost:3001/dashboard/conversations
   ```

4. **Select Facebook Conversation**
   - Should show conversation with your Facebook name
   - May include profile picture
   - Click to open

5. **Open Customer Info Sidebar**
   - Click "Customer Info" button

### Expected Results:

✅ **Profile Section:**
- Name displays: Your Facebook name (e.g., "Jane Smith")
- Profile picture: Your Facebook profile picture (if available)
- Platform badge shows: "Facebook"
- Facebook Profile link appears
- No Instagram profile link

✅ **Contact Info Section:**
- Email field: Empty (can be added)
- Phone field: Empty (can be added)
- Address field: Empty (can be added)
- All fields are editable

---

## Test 4: Cross-Platform Verification

### Test All Three in Sequence:

1. **Create Widget Conversation** (John Doe, john@example.com)
2. **Create Instagram Conversation** (@instagram_user)
3. **Create Facebook Conversation** (Jane Smith)

### In Dashboard Conversations List:

✅ **Verify Different Icons:**
- Widget: Should show widget icon
- Instagram: Should show Instagram icon
- Facebook: Should show Facebook icon

✅ **Verify Customer Names:**
- Widget: "John Doe"
- Instagram: "@instagram_user"
- Facebook: "Jane Smith"

### In Customer Info Sidebar:

✅ **Verify Platform Badges:**
- Each conversation shows correct platform badge
- Website / Instagram / Facebook

✅ **Verify Profile Links:**
- Widget: No profile links
- Instagram: Instagram DM link only
- Facebook: Facebook profile link only

✅ **Verify Email Display:**
- Widget: Email shown in profile
- Instagram: No email (unless manually added)
- Facebook: No email (unless manually added)

---

## Test 5: Edge Cases

### Test 5a: Widget with Long Name
- Name: "Dr. Christopher Alexander Montgomery III"
- Expected: Full name displays correctly, no truncation issues

### Test 5b: Widget with Special Characters in Email
- Email: "user+test@example.co.uk"
- Expected: Email saves and displays correctly, mailto link works

### Test 5c: Instagram User with No Username
- Expected: Shows "ig_user_XXXX" format

### Test 5d: Adding/Editing Contact Info
1. Open any conversation
2. Click Contact Info field (email/phone/address)
3. Type new value
4. Press Enter
5. Expected: Saves immediately, shows in both sections

### Test 5e: Invalid Email Format
1. Try to save email: "notanemail"
2. Expected: Shows validation error

### Test 5f: Clearing Contact Info
1. Edit email field
2. Clear all text
3. Save
4. Expected: Email is removed from profile and contact sections

---

## Test 6: API Verification

### Test Profile API Directly:

```bash
# Get conversation ID from database or URL
CONVERSATION_ID="your-conversation-id"

# Test Widget Profile
curl http://localhost:3001/api/conversations/$CONVERSATION_ID/customer-profile \
  -H "Cookie: your-session-cookie"
```

**Expected Response (Widget):**
```json
{
  "profile": {
    "id": "widget_123...",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "profilePicture": null,
    "locale": "en_US",
    "email": "john.doe@example.com",
    "phone": null,
    "address": null,
    "platform": "widget",
    "cached": true,
    "cachedAt": "2025-01-15T..."
  },
  "source": "widget"
}
```

**Expected Response (Instagram):**
```json
{
  "profile": {
    "id": "instagram_123...",
    "firstName": "@username",
    "lastName": "",
    "fullName": "@username",
    "profilePicture": null,
    "locale": "en_US",
    "instagramUrl": "https://www.instagram.com/direct/t/...",
    "email": null,
    "phone": null,
    "address": null,
    "platform": "instagram",
    "cached": true,
    "cachedAt": "2025-01-15T..."
  },
  "source": "default"
}
```

---

## Troubleshooting

### Widget name not showing:
- Check: Is `customerName` stored in conversation?
- SQL: `SELECT customerName FROM "Conversation" WHERE platform = 'WIDGET';`
- If null: Widget form submission may have failed

### Instagram shows generic ID:
- Check: Does conversation have `customerName`?
- This is expected - Instagram API doesn't provide username
- Can be manually updated by editing contact info

### Email not appearing:
- Check: Is `customerEmail` in conversation table?
- Check: Does API response include email field?
- Check: Browser console for JavaScript errors

### Profile picture not loading:
- Check: Is `profilePicture` URL valid?
- Check: Facebook API permissions
- Check: Image URL in browser directly

### Platform badge missing:
- Check: Does profile have `platform` field?
- Check: Browser console for React errors
- Refresh page and check again

---

## Success Criteria

✅ All three platforms (Widget, Instagram, Facebook) display correctly
✅ Customer names show properly (not generic IDs)
✅ Platform badges appear for all conversations
✅ Profile links only show for relevant platforms
✅ Emails display in profile section when available
✅ Contact info (email/phone/address) is editable
✅ Changes save immediately
✅ No JavaScript errors in console
✅ No broken links or 404 errors

---

## Console Debugging

### Enable Verbose Logging:

**Browser Console:**
```javascript
localStorage.setItem('debug', 'customer-info');
location.reload();
```

**Server Logs:**
Watch for these patterns:
```
📊 Starting profile fetch for conversation...
✅ Fetched customer profile...
🔍 Widget presence check...
```

---

## Reporting Issues

If tests fail, collect:
1. Screenshot of Customer Info sidebar
2. Browser console errors
3. Server console logs
4. Conversation ID
5. Platform type (Widget/Instagram/Facebook)
6. Steps to reproduce

---

**Happy Testing! 🎉**

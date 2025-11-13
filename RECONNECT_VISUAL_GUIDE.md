# Reconnect Feature - Visual Guide

## Location
- **Facebook:** https://chatbridge.raka.my.id/dashboard/integrations/facebook/manage
- **Instagram:** https://chatbridge.raka.my.id/dashboard/integrations/instagram/manage

## What You'll See

### Facebook Pages - Before Click
```
┌────────────────────────────────────┐
│  [FB Logo]  Chateez            ⋮  │ ← Three dots menu button
│             ● Active               │
│             👥 1.2K followers      │
│             📄 450 posts           │
│                                    │
│  🤖 AI Auto-Response     [Toggle]  │
│                                    │
│  [           Delete           ]    │
└────────────────────────────────────┘
```

### Facebook Pages - After Click (Dropdown Open)
```
┌────────────────────────────────────┐
│  [FB Logo]  Chateez            ⋮  │
│             ● Active        ┌──────────────────┐
│             👥 1.2K         │ 🔄 Reconnect Page│ ← Click this
│             📄 450          └──────────────────┘
│                                    │
│  🤖 AI Auto-Response     [Toggle]  │
│                                    │
│  [           Delete           ]    │
└────────────────────────────────────┘
```

### Instagram Accounts - Before Click
```
┌────────────────────────────────────┐
│  [IG Photo] @yourusername      ⋮  │ ← Three dots menu button
│             Your Display Name      │
│             ● Active               │
│             250 posts              │
│                                    │
│  🤖 AI Auto-Response     [Toggle]  │
│                                    │
│  [           Delete           ]    │
└────────────────────────────────────┘
```

### Instagram Accounts - After Click (Dropdown Open)
```
┌────────────────────────────────────┐
│  [IG Photo] @yourusername      ⋮  │
│             Your Display Name      │
│             ● Active        ┌──────────────────────┐
│             250 posts       │ 🔄 Reconnect Account │ ← Click this
│                             └──────────────────────┘
│  🤖 AI Auto-Response     [Toggle]  │
│                                    │
│  [           Delete           ]    │
└────────────────────────────────────┘
```

## User Flow

### Step 1: Navigate to Manage Page
```
Dashboard → Integrations → [Facebook/Instagram] → Manage
```

### Step 2: Click Three Dots Menu
```
Connected Page Card → Click ⋮ button (top-right corner)
```

### Step 3: Select Reconnect
```
Dropdown Menu → Click "🔄 Reconnect Page/Account"
```

### Step 4: OAuth Flow
```
Redirects to:
- Facebook: /dashboard/integrations/facebook/setup?reconnect={pageId}
- Instagram: /dashboard/integrations/instagram/setup?reconnect={connectionId}

User goes through:
1. Meta OAuth login screen
2. Permission approval
3. Page/Account selection
4. Success callback
```

### Step 5: Success
```
Redirects back to manage page with:
✅ "Page/Account reconnected successfully!"
```

## What Happens Behind the Scenes

### 1. User Clicks "Reconnect Page"
```typescript
handleReconnect("844534192080032") // Facebook Page ID
// → Navigates to: /dashboard/integrations/facebook/setup?reconnect=844534192080032
```

### 2. Setup Page Detects Reconnect Mode
```typescript
const searchParams = useSearchParams();
const reconnectPageId = searchParams.get('reconnect');

if (reconnectPageId) {
  // Show: "Reconnecting Chateez..."
  // Instead of: "Connect New Page"
}
```

### 3. OAuth Callback Updates Existing Connection
```typescript
// Instead of creating new connection:
await db.pageConnection.create({ ... });

// Update existing connection:
await db.pageConnection.update({
  where: { pageId: reconnectPageId },
  data: {
    pageAccessTokenEnc: newEncryptedToken,
    profilePictureUrl: freshProfilePicUrl,
    webhookConnected: true,
    updatedAt: new Date(),
  }
});
```

### 4. Redirect Back with Success Message
```typescript
router.push('/dashboard/integrations/facebook/manage?facebook_success=true&message=Page%20reconnected');
```

## When to Use This Feature

### ✅ Good Use Cases
1. **Token Expired:** "Your Facebook Page token has expired"
2. **Permission Updates:** After approving new Meta permissions
3. **Webhook Issues:** When messages aren't syncing
4. **Profile Updates:** Refresh page name/picture
5. **Connection Troubleshooting:** General connectivity problems

### ❌ Don't Use For
1. **First-time Setup:** Use "Add Page" button instead
2. **Switching Accounts:** Disconnect old, connect new
3. **Testing:** Use proper test environment

## Keyboard Shortcuts

```
Tab       → Navigate to three-dots button
Enter     → Open dropdown menu
↓/↑       → Navigate menu items (future: if more items added)
Enter     → Select "Reconnect"
Esc       → Close dropdown menu
```

## Mobile Experience

### On Mobile (< 768px)
```
┌─────────────────────┐
│ [Logo] Page Name ⋮ │ ← Menu button still visible
│      ● Active       │
│                     │
│ 🤖 Auto [Toggle]    │
│                     │
│ [    Delete    ]    │
└─────────────────────┘
```

### Dropdown on Mobile
- Appears as overlay
- Full touch support
- Closes on tap outside
- Large touch targets

## Color Scheme

### Menu Button (Three Dots)
- **Default:** Gray (hover: darker gray)
- **Active/Open:** Blue highlight
- **Size:** 32x32px (8px padding)

### Dropdown Menu
- **Background:** White
- **Border:** Light gray (#e5e7eb)
- **Shadow:** Subtle drop shadow
- **Hover:** Light blue background (#f0f9ff)

### Reconnect Icon
- **Icon:** RefreshCw (rotate animation on click)
- **Color:** Primary blue (#2563eb)
- **Size:** 16x16px

## Error States

### If Reconnect Fails
```
❌ Failed to reconnect page: [error message]
   - Token validation failed
   - Page no longer accessible
   - Network error
```

### If Page Was Deleted
```
❌ Page not found. Please remove and reconnect.
```

### If User Cancels OAuth
```
ℹ️  Reconnection cancelled by user
```

## Success States

### After Successful Reconnect
```
✅ Chateez reconnected successfully!
   - New token saved
   - Webhook resubscribed
   - Profile updated
```

### Card Updates Immediately
- ✅ New profile picture loaded
- ✅ Updated page name (if changed)
- ✅ Fresh follower count
- ✅ Webhook status: Active

## Developer Notes

### Debug Mode
To test reconnect flow:
```typescript
// Add console logs in handleReconnect
console.log('Reconnecting page:', pageId);
console.log('Redirect URL:', redirectUrl);
```

### Monitor Network
```
1. Open DevTools → Network tab
2. Click "Reconnect Page"
3. Watch for:
   - Redirect to /setup?reconnect=...
   - OAuth callback
   - Token update API call
   - Profile refresh API call
```

### Check Database
```sql
-- Check if token was updated
SELECT pageId, pageName, updatedAt 
FROM PageConnection 
WHERE pageId = '844534192080032'
ORDER BY updatedAt DESC;

-- Should show recent updatedAt timestamp
```

## FAQ

**Q: Will reconnecting delete my conversations?**
A: No, all conversations are preserved. Only the access token is refreshed.

**Q: Do I need to reconfigure webhooks?**
A: No, webhooks are automatically resubscribed during reconnection.

**Q: How often should I reconnect?**
A: Only when experiencing connection issues. Tokens typically last 60+ days.

**Q: Can I reconnect multiple pages at once?**
A: No, reconnect each page individually for safety.

**Q: What if I connect the wrong page during reconnect?**
A: The system will update the existing connection to the new page. You may want to disconnect and reconnect properly.

## Related Features

- 🗑️ **Delete Button:** Removes page/account completely
- ➕ **Add Page Button:** Connects new page/account
- 🤖 **Auto-Bot Toggle:** Enable/disable AI responses
- 📊 **Statistics Display:** View follower/post counts

## Support

If reconnection fails:
1. Check Meta App Dashboard for permission issues
2. Verify page is still accessible
3. Check browser console for errors
4. Try disconnecting and reconnecting manually
5. Contact support with error message

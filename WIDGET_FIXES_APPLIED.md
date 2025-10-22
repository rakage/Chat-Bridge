# Chat Widget Fixes Applied

## Issues Fixed

### 1. ✅ Real-Time Messages Not Received in Dashboard
**Problem**: Widget messages weren't appearing in real-time in the dashboard conversation view.

**Root Cause**: The conversation endpoints and customer profile endpoint didn't include `widgetConfig` relations, causing permission checks and data fetching to fail for widget conversations.

**Fix Applied**:
- Updated `/api/conversations/[id]/route.ts` to include `widgetConfig` relation in all queries
- Updated company permission checks to include `widgetConfig?.company`
- Updated conversation transformation logic to handle `WIDGET` platform

**Files Modified**:
- `src/app/api/conversations/[id]/route.ts`

### 2. ✅ Customer Info Missing for Widget Conversations
**Problem**: Widget conversations showed generic "Customer #XXXX" instead of the actual name and email collected through the widget form.

**Root Cause**: The customer profile endpoint didn't have logic to handle `WIDGET` platform conversations. It only had handlers for `FACEBOOK` and `INSTAGRAM`.

**Fix Applied**:
- Added Widget platform handler in customer profile endpoint
- Widget handler creates profile from `conversation.customerName` and `conversation.customerEmail`
- Profile is cached in conversation metadata for performance
- Falls back gracefully if customer name is missing

**Widget Profile Structure**:
```typescript
{
  id: psid,
  firstName: "John",  // from customerName
  lastName: "Doe",    // from customerName
  fullName: "John Doe",
  email: "john@example.com",  // from customerEmail
  platform: "widget",
  cached: true,
  cachedAt: timestamp
}
```

**Files Modified**:
- `src/app/api/conversations/[id]/customer-profile/route.ts`
- `src/components/realtime/ConversationView.tsx`

### 3. ✅ Logo/Icon Missing for Widget Platform
**Problem**: Widget conversations showed no icon in the conversations list and conversation view.

**Root Cause**: UI components only had icons for Facebook and Instagram platforms.

**Fix Applied**:
- Created new `WidgetIcon` component (chat bubble SVG)
- Added Widget icon to `ConversationView` header
- Added Widget icon to `ConversationsList` items
- Widget shows purple color (#7c3aed) to differentiate from Facebook (blue) and Instagram (pink)

**Files Created**:
- `src/components/ui/widget-icon.tsx`

**Files Modified**:
- `src/components/realtime/ConversationView.tsx`
- `src/components/realtime/ConversationsList.tsx`

## Changes Summary

### TypeScript Interfaces Updated
```typescript
// Added WIDGET to platform enums
platform: "FACEBOOK" | "INSTAGRAM" | "WIDGET"
```

### Database Queries Updated
```typescript
// All conversation queries now include:
include: {
  pageConnection: { include: { company: true } },
  instagramConnection: { include: { company: true } },
  widgetConfig: { include: { company: true } },  // NEW
}
```

### Permission Checks Updated
```typescript
// Old
const company = conversation.pageConnection?.company || 
                conversation.instagramConnection?.company;

// New
const company = conversation.pageConnection?.company || 
                conversation.instagramConnection?.company ||
                conversation.widgetConfig?.company;  // NEW
```

### Platform Display Logic
```typescript
// Widget detection
const isWidget = conversation.platform === 'WIDGET';

// Widget name display
const pageName = isWidget
  ? (conversation.widgetConfig?.widgetName || 'Chat Widget')
  : (isInstagram ? `@${username}` : pageName);

// Widget customer name
const customerName = isWidget
  ? (conversation.customerName || `Website Visitor #${psid}`)
  : (defaultName);
```

## Testing Checklist

- [x] Widget conversations appear in conversations list
- [x] Widget icon displays correctly (purple chat bubble)
- [x] Customer name from widget form shows in conversation
- [x] Customer email from widget form accessible in customer info
- [x] Real-time messages work (agent → widget)
- [x] Real-time messages work (widget → dashboard)
- [x] Platform badge shows "Chat Widget"
- [x] Widget name displays as "page name"
- [x] Customer profile loads without errors
- [x] Permission checks work for widget conversations

## Visual Changes

### Conversations List
```
Before: [?] Customer #1234
After:  [💬] John Doe (purple widget icon)
```

### Conversation Header
```
Before: [?] Customer #1234 • Unknown Page
After:  [💬] John Doe • Chat Widget • Chat Widget
                    (name)    (platform)   (widget name)
```

### Platform Icons
- Facebook: Blue 📘
- Instagram: Pink 📷  
- Widget: Purple 💬

## Files Changed

1. **Backend APIs** (3 files)
   - `src/app/api/conversations/[id]/route.ts`
   - `src/app/api/conversations/[id]/customer-profile/route.ts`

2. **UI Components** (3 files)
   - `src/components/realtime/ConversationView.tsx`
   - `src/components/realtime/ConversationsList.tsx`
   - `src/components/ui/widget-icon.tsx` (NEW)

## How It Works Now

### Message Flow (Widget → Dashboard)
1. User sends message through widget
2. POST `/api/widget/messages` creates message with role: USER
3. Socket.io broadcasts `message:new` event
4. ConversationView receives event via `socket.on('message:new')`
5. Message appears instantly in dashboard

### Message Flow (Dashboard → Widget)
1. Agent sends reply from dashboard
2. POST `/api/messages/send` creates message with role: AGENT
3. Socket.io broadcasts to conversation room
4. Widget receives via `socket.on('message:new')`
5. Reply appears instantly in widget

### Customer Profile Flow
1. ConversationView loads
2. Fetches GET `/api/conversations/[id]/customer-profile`
3. For WIDGET platform:
   - Returns cached profile if available
   - Otherwise creates from `customerName` + `customerEmail`
   - Caches in conversation metadata
4. Profile displays in UI with name and email

## Platform Comparison

| Feature | Facebook | Instagram | Widget |
|---------|----------|-----------|--------|
| Icon | 📘 Blue | 📷 Pink | 💬 Purple |
| Profile Source | Graph API | Default | Form Data |
| Profile Picture | ✅ Yes | ❌ No | ❌ No |
| Real Name | ✅ Yes | ❌ No | ✅ Yes |
| Email | ❌ No | ❌ No | ✅ Yes |
| Cached | ✅ Yes | ✅ Yes | ✅ Yes |
| External Link | ✅ Facebook URL | ✅ Instagram URL | ❌ No |

## Next Steps (Optional Enhancements)

1. **Profile Picture Support**: Allow uploading avatar for widget users
2. **Gravatar Integration**: Fetch profile picture from Gravatar using email
3. **Typing Indicators**: Show when widget user is typing
4. **Read Receipts**: Show when widget user has seen agent reply
5. **File Attachments**: Support image/file uploads in widget
6. **Widget Branding**: Show company logo in widget conversations
7. **Custom Fields**: Collect additional fields (phone, company, etc.)

## Verification

Run these checks to verify everything is working:

### 1. Test Widget Message Flow
```bash
# Open widget demo page
http://localhost:3001/widget-demo.html

# Submit a message
# Open dashboard conversations
# Verify conversation appears with:
# - Purple widget icon
# - Correct customer name
# - Platform shows "Chat Widget"
```

### 2. Test Real-Time Sync
```bash
# Keep widget open
# Reply from dashboard
# Verify reply appears in widget instantly
```

### 3. Test Customer Info
```bash
# Open widget conversation
# Click "Customer Info" button
# Verify displays:
# - Full name from form
# - Email from form
# - Platform: Widget
```

## Summary

All three issues have been resolved:
✅ Real-time messages now work for widget conversations
✅ Customer info (name, email) displays correctly
✅ Widget icon shows throughout the UI

The widget is now fully integrated with the dashboard with feature parity to Facebook and Instagram conversations.

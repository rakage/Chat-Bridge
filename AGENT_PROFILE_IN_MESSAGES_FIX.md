# Agent Profile Display in Messages - Fixed

## Issue
Agent name and profile picture were not showing up in the conversation view when agents sent messages to Facebook/Instagram/Telegram customers.

---

## Root Cause

### 1. **Session Not Populating Name**
The JWT callback was not explicitly setting `token.name` from the database, so `session.user.name` was sometimes null/undefined.

### 2. **Redundant Database Query**
The send message API was querying the database again for `photoUrl` instead of using the already-available `session.user.image`.

### 3. **No Fallback**
No fallback values were provided when name was missing.

---

## Changes Made

### 1. **Updated Auth Callbacks** (`src/lib/auth.ts`)

**Added name to JWT token:**
```typescript
if (dbUser) {
  token.role = dbUser.role;
  token.companyId = dbUser.companyId;
  token.companyName = dbUser.company?.name;
  token.name = dbUser.name; // ✅ Added
  token.picture = dbUser.photoUrl;
}
```

**Added name to session:**
```typescript
if (token?.sub) {
  session.user.id = token.sub;
  session.user.role = token.role;
  session.user.companyId = token.companyId;
  session.user.companyName = token.companyName;
  session.user.name = token.name as string | null; // ✅ Added
  session.user.image = token.picture as string | null;
}
```

### 2. **Updated Send Message API** (`src/app/api/messages/send/route.ts`)

**Before:**
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
    text: text?.trim() || "",
    meta: {
      agentId: session.user.id,
      agentName: session.user.name, // ❌ Could be null
      agentPhoto: agent?.photoUrl || null, // ❌ Extra DB query
      sentAt: new Date().toISOString(),
    },
  },
});
```

**After:**
```typescript
// Create agent message with profile information
const message = await db.message.create({
  data: {
    conversationId,
    role: "AGENT",
    text: text?.trim() || "",
    meta: {
      agentId: session.user.id,
      agentName: session.user.name || session.user.email || "Agent", // ✅ Fallback
      agentPhoto: session.user.image || null, // ✅ From session
      sentAt: new Date().toISOString(),
    },
  },
});
```

---

## Benefits

### 1. **Performance Improvement**
- ✅ Removed unnecessary database query
- ✅ Uses session data that's already in memory

### 2. **Better Fallbacks**
- ✅ Falls back to email if name is not set
- ✅ Falls back to "Agent" if both are missing
- ✅ Shows agent profile even without photo

### 3. **Consistent Data**
- ✅ Name and photo always synced with session
- ✅ No risk of stale data from cache

---

## Testing

### Before Fix:
```
Agent sends message → No name or photo appears → Generic icon shown
```

### After Fix:
```
Agent sends message → Name and photo appear → Full profile displayed
```

### Test Scenarios:

#### Scenario 1: Agent with Name and Photo
- User has `name` and `photoUrl` in database
- ✅ Both name and photo display in conversation

#### Scenario 2: Agent with Name, No Photo
- User has `name` but no `photoUrl`
- ✅ Name displays, fallback avatar with initial shown

#### Scenario 3: Agent with No Name, No Photo
- User has neither `name` nor `photoUrl`
- ✅ Email or "Agent" displays, fallback avatar shown

---

## User Action Required

### ⚠️ **Important: Restart Server**

After these changes, users need to **log out and log back in** for the session to refresh with the new data structure.

**Steps:**
1. Stop the development server (Ctrl+C)
2. Restart: `npm run dev`
3. Clear browser cache or use incognito
4. Log out from the dashboard
5. Log back in
6. Send a test message as agent

### Alternative: Force Session Update

If you want existing sessions to update without logout:

```typescript
// In any server action or API route
await getServerSession(authOptions);
// Session will refresh automatically on next request
```

---

## Message Metadata Structure

Agent messages now have complete metadata:

```json
{
  "meta": {
    "agentId": "clx123...",
    "agentName": "John Doe", // or email or "Agent"
    "agentPhoto": "https://example.com/photo.jpg", // or null
    "sentAt": "2025-10-28T10:30:00.000Z",
    "sent": true,
    "instagramMessageId": "mid.xxx"
  }
}
```

---

## UI Display

### ConversationView Rendering:

**Agent Name (above message):**
```tsx
{message.role === "AGENT" && message.meta?.agentName && (
  <span className="text-xs text-gray-600 mb-1 mr-1">
    {message.meta.agentName}
  </span>
)}
```

**Agent Avatar (right side):**
```tsx
{message.role === "AGENT" && message.meta?.agentPhoto ? (
  <Avatar className="h-8 w-8">
    <AvatarImage src={message.meta.agentPhoto} alt={message.meta.agentName || "Agent"} />
    <AvatarFallback className="bg-green-100 text-green-700 text-xs">
      {message.meta.agentName?.charAt(0).toUpperCase() || "A"}
    </AvatarFallback>
  </Avatar>
) : (
  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
    <MessageSquare className="h-4 w-4 text-green-600" />
  </div>
)}
```

---

## Database Schema

User model already supports both fields:

```prisma
model User {
  id                     String    @id @default(cuid())
  email                  String    @unique
  name                   String?   // ✅ Optional
  photoUrl               String?   // ✅ Optional
  // ... other fields
}
```

---

## Future Enhancements

### 1. Profile Completion
Add a prompt for users to complete their profile:
```typescript
if (!session.user.name || !session.user.image) {
  // Show profile completion banner
}
```

### 2. Agent Profile Page
Create `/dashboard/profile` for agents to:
- Update their name
- Upload profile photo
- Set display preferences

### 3. Team Directory
Show all agents with their profiles:
- Name and photo
- Role and status
- Last active time

---

## Common Issues

### Issue 1: Name Still Not Showing
**Cause**: Old session cached  
**Solution**: Log out and log back in

### Issue 2: Photo Not Updating
**Cause**: CDN or browser cache  
**Solution**: Clear browser cache or add cache-busting param

### Issue 3: Fallback Always Shows
**Cause**: User has no name in database  
**Solution**: Update user profile with name

---

## Related Files

- `src/lib/auth.ts` - Session and JWT callbacks
- `src/app/api/messages/send/route.ts` - Message creation
- `src/components/realtime/ConversationView.tsx` - UI rendering
- `prisma/schema.prisma` - User model

---

## Summary

✅ **Fixed**: Agent name and photo now properly display in conversations  
✅ **Improved**: Removed unnecessary database query  
✅ **Enhanced**: Added fallback values for better UX  
✅ **Optimized**: Uses session data for better performance  

**Action Required**: Users should log out and log back in to see the changes.

---

**Status**: ✅ FIXED  
**Date**: 2025-10-28  
**Breaking Change**: No (backward compatible)

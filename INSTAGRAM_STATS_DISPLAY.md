# Instagram Followers and Posts Count Display

## Overview
Added followers and posts count display to the Instagram manage page, matching the Facebook page statistics design for consistency.

## Changes Made

### 1. Database Schema Update
**File:** `prisma/schema.prisma`

**Added Field:**
```prisma
model InstagramConnection {
  // ... existing fields ...
  mediaCount           Int      @default(0)
  followersCount       Int?     // NEW: Instagram followers count
  conversationsCount   Int      @default(0)
  // ... rest of fields ...
}
```

### 2. Database Migration
**File:** `migration-add-instagram-followers-count.sql`

**SQL to Run:**
```sql
ALTER TABLE instagram_connections 
ADD COLUMN IF NOT EXISTS "followersCount" INTEGER;

UPDATE instagram_connections 
SET "followersCount" = 0 
WHERE "followersCount" IS NULL;
```

**How to Apply:**
1. Go to your Supabase dashboard
2. Open SQL Editor
3. Run the migration SQL
4. Verify with: `SELECT "followersCount" FROM instagram_connections LIMIT 1;`

### 3. Instagram API Enhancement
**File:** `src/app/api/instagram/connections/route.ts`

**Changes:**

#### A. Added Field to Select Query
```typescript
select: {
  // ... existing fields ...
  mediaCount: true,
  followersCount: true,  // NEW
  // ... rest of fields ...
}
```

#### B. Enhanced API Call
**Before:**
```typescript
`https://graph.instagram.com/me?fields=id,username,account_type,media_count,profile_picture_url&access_token=${accessToken}`
```

**After:**
```typescript
`https://graph.instagram.com/me?fields=id,username,account_type,media_count,followers_count,profile_picture_url&access_token=${accessToken}`
```

#### C. Updated Database with Fresh Stats
```typescript
const freshData = await response.json();
freshProfilePictureUrl = freshData.profile_picture_url || conn.profilePictureUrl;
const freshMediaCount = freshData.media_count || conn.mediaCount;
const freshFollowersCount = freshData.followers_count || conn.followersCount || 0;

await db.instagramConnection.update({
  where: { id: conn.id },
  data: { 
    profilePictureUrl: freshProfilePictureUrl,
    mediaCount: freshMediaCount,
    followersCount: freshFollowersCount,  // NEW
  },
});
```

#### D. Return Updated Data
```typescript
return {
  // ... existing fields ...
  mediaCount: conn.mediaCount,
  followersCount: (conn as any).followersCount || 0,  // NEW
  // ... rest of fields ...
};
```

### 4. UI Component Update
**File:** `src/app/dashboard/integrations/instagram/manage/page.tsx`

**Changes:**

#### A. Added Icons Import
```typescript
import { 
  // ... existing icons ...
  Users,      // NEW: For followers
  FileText    // NEW: For posts
} from "lucide-react";
```

#### B. Replaced Badge Stats with Icon Stats Section

**Before:**
```tsx
<div className="flex items-center mt-2 space-x-2 flex-wrap gap-1">
  <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-200">
    ● Active
  </Badge>
  {connection.mediaCount > 0 && (
    <span className="text-xs text-gray-500">
      {connection.mediaCount} posts
    </span>
  )}
</div>
```

**After:**
```tsx
<div className="flex items-center mt-2 space-x-2 flex-wrap gap-1">
  <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-200">
    ● Active
  </Badge>
</div>

{/* Page Statistics */}
{((connection.followersCount > 0) || (connection.mediaCount > 0)) && (
  <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
    {connection.followersCount > 0 && (
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4" />
        <span className="font-medium">{connection.followersCount.toLocaleString()}</span>
        <span className="text-gray-500">followers</span>
      </div>
    )}
    {connection.mediaCount > 0 && (
      <div className="flex items-center gap-1.5">
        <FileText className="h-4 w-4" />
        <span className="font-medium">{connection.mediaCount.toLocaleString()}</span>
        <span className="text-gray-500">posts</span>
      </div>
    )}
  </div>
)}
```

## Visual Comparison

### Before
```
┌─────────────────────────────────┐
│ [Photo] @username           ⋮  │
│         Display Name            │
│         ● Active  250 posts     │ ← Plain text
└─────────────────────────────────┘
```

### After
```
┌─────────────────────────────────┐
│ [Photo] @username           ⋮  │
│         Display Name            │
│         ● Active                │
│                                 │
│         👥 1,234  📄 250        │ ← With icons!
│         followers  posts         │
└─────────────────────────────────┘
```

## Features

### 1. Followers Count Display
- ✅ Shows follower count with Users icon (👥)
- ✅ Formatted with thousand separators (1,234)
- ✅ Only shows if count > 0
- ✅ Fetched from Instagram Graph API

### 2. Posts Count Display
- ✅ Shows posts count with FileText icon (📄)
- ✅ Formatted with thousand separators (450)
- ✅ Only shows if count > 0
- ✅ Fetched from Instagram Graph API (`media_count`)

### 3. Real-time Updates
- ✅ Fetches fresh stats every time manage page loads
- ✅ Updates database with latest values
- ✅ Falls back to cached values if API fails

### 4. Consistent Design
- ✅ Matches Facebook page statistics layout
- ✅ Same icons and formatting
- ✅ Same spacing and typography
- ✅ Professional appearance

## Instagram Graph API Fields

| Field | Description | Display |
|-------|-------------|---------|
| `media_count` | Total published posts | 📄 Posts count |
| `followers_count` | Number of followers | 👥 Followers count |
| `profile_picture_url` | Profile image | Account picture |
| `username` | Instagram handle | @username |
| `account_type` | Business/Creator | Internal use |

## Data Flow

```
Instagram Manage Page Load
    ↓
API: GET /api/instagram/connections
    ↓
For each connection:
    ├─ Decrypt access token
    ├─ Fetch from Instagram: /me?fields=...,media_count,followers_count,...
    ├─ Update database with fresh stats
    └─ Return formatted data
    ↓
UI displays with icons and formatting
```

## Benefits

### User Experience
- ✅ **At-a-Glance Insights:** See account stats immediately
- ✅ **Visual Recognition:** Icons make data easier to scan
- ✅ **Professional Look:** Consistent with Facebook page design
- ✅ **Up-to-Date:** Always fetches latest stats from Instagram

### Technical
- ✅ **Single API Call:** Gets all data in one request
- ✅ **Database Cached:** Stores values as fallback
- ✅ **Error Handling:** Graceful fallback to cached values
- ✅ **Type-Safe:** Proper TypeScript types with Prisma

## Setup Instructions

### Step 1: Run Database Migration
```bash
# Option 1: Using SQL Editor in Supabase
# Copy content from migration-add-instagram-followers-count.sql
# Paste and run in Supabase SQL Editor

# Option 2: Using psql (if you have direct access)
psql $DATABASE_URL -f migration-add-instagram-followers-count.sql
```

### Step 2: Generate Prisma Client
```bash
npx prisma generate
```

### Step 3: Restart Application
```bash
npm run dev  # or pm2 restart if using PM2
```

### Step 4: Verify
1. Go to `/dashboard/integrations/instagram/manage`
2. Should see followers and posts count for each account
3. Check browser console for "Fresh profile data fetched" logs

## Edge Cases Handled

### No Followers Count
```typescript
connection.followersCount > 0  // Only show if count exists and > 0
```

### No Posts Count
```typescript
connection.mediaCount > 0  // Only show if count exists and > 0
```

### API Failure
```typescript
// Falls back to cached database values
const freshFollowersCount = freshData.followers_count || conn.followersCount || 0;
```

### Missing Database Field (Before Migration)
```typescript
followersCount: (conn as any).followersCount || 0  // Returns 0 if field doesn't exist
```

## Troubleshooting

### Issue: Followers Count Not Showing

**Check:**
1. Database field exists: `SELECT "followersCount" FROM instagram_connections LIMIT 1;`
2. Instagram API permissions include `instagram_basic`
3. Account type is "business" or "creator" (personal accounts don't have followers_count)
4. Browser console for API errors

### Issue: Stats Show 0

**Possible Causes:**
- Account actually has 0 followers/posts
- Instagram API permission issue
- Access token expired
- Account type is personal (not business/creator)

**Fix:**
1. Reconnect Instagram account
2. Ensure it's a Business or Creator account
3. Check API response in server logs

### Issue: TypeScript Errors

**Fix:**
```bash
npx prisma generate  # Regenerate Prisma types
npx tsc --noEmit     # Verify no errors
```

## Testing Checklist

### Functional Tests
- [ ] Followers count displays correctly
- [ ] Posts count displays correctly
- [ ] Numbers formatted with commas (1,234)
- [ ] Icons display properly
- [ ] Hidden when count is 0
- [ ] Updates on page reload
- [ ] Falls back gracefully if API fails

### Visual Tests
- [ ] Matches Facebook page design
- [ ] Proper spacing between followers and posts
- [ ] Icons aligned with text
- [ ] Responsive on mobile/tablet
- [ ] Doesn't overlap with three-dots menu
- [ ] Text doesn't overflow

### API Tests
- [ ] Instagram API call includes `followers_count`
- [ ] Database updates with fresh values
- [ ] Returns correct data structure
- [ ] Handles API errors gracefully
- [ ] Logs informative messages

## Files Modified

1. ✅ `prisma/schema.prisma` - Added followersCount field
2. ✅ `migration-add-instagram-followers-count.sql` - Database migration
3. ✅ `src/app/api/instagram/connections/route.ts` - API enhancement
4. ✅ `src/app/dashboard/integrations/instagram/manage/page.tsx` - UI update

## Consistency with Facebook

Both Facebook and Instagram manage pages now display:
- ✅ Profile pictures
- ✅ Followers count with Users icon
- ✅ Posts count with FileText icon
- ✅ Thousand separator formatting
- ✅ Same styling and layout
- ✅ Same spacing and typography

## Future Enhancements (Optional)

Could add:
- 📈 Engagement rate
- 👁️ Impressions/Reach
- 💬 Comments count
- ❤️ Likes average
- 📅 Last post date
- ⏰ Account age
- 🔄 Post frequency indicator
- 📊 Growth trend (week/month)

## Notes

- Instagram `followers_count` only available for Business/Creator accounts
- Personal Instagram accounts will show 0 or null
- Stats refresh every time manage page loads
- Instagram API has rate limits (200 calls/hour per user)
- Profile pictures are also refreshed to avoid expired URLs
- Values cached in database as fallback

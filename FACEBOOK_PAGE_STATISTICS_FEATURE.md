# Facebook Page Statistics Feature

## Overview

This feature displays comprehensive Facebook Page statistics when users connect their Facebook Pages to the dashboard, including:
- Profile Picture
- Followers Count (Likes)
- Posts Count (Published Posts)

## Implementation Summary

### 1. Database Schema Updates

Added new fields to the `PageConnection` model:

```prisma
model PageConnection {
  // ... existing fields
  profilePictureUrl  String?
  followersCount     Int?     // NEW: Number of page followers/likes
  postsCount         Int?     // NEW: Number of published posts
  // ... existing fields
}
```

### 2. Facebook API Methods

Added new methods to `src/lib/facebook.ts`:

#### `getPageStatistics(pageAccessToken: string)`
Fetches followers and posts count from Facebook Graph API.

**API Endpoint Used:**
```
GET /me?fields=followers_count,published_posts.limit(0).summary(true)
```

**Returns:**
```typescript
{
  followersCount: number;
  postsCount: number;
}
```

#### `getPageFullData(pageAccessToken: string)`
Fetches comprehensive page data including profile picture and statistics in parallel.

**Returns:**
```typescript
{
  id: string;
  name: string;
  category: string;
  profilePictureUrl: string | null;
  followersCount: number;
  postsCount: number;
}
```

### 3. API Route Updates

#### `/api/settings/page/connect-oauth` (POST)
Updated to fetch and save page statistics when connecting a Facebook Page:
- Fetches page profile picture
- Fetches followers count
- Fetches posts count
- Saves all data to database

#### `/api/settings/page` (GET)
Updated to include statistics in the response:
- Returns `followersCount`
- Returns `postsCount`
- Returns `profilePictureUrl`

### 4. UI Updates

#### Facebook Manage Page (`/dashboard/integrations/facebook/manage`)

Each connected page now displays:

```tsx
<div className="flex items-center gap-4 text-sm text-gray-600">
  <div className="flex items-center gap-1.5">
    <Users className="h-4 w-4" />
    <span className="font-medium">{followersCount.toLocaleString()}</span>
    <span className="text-gray-500">followers</span>
  </div>
  <div className="flex items-center gap-1.5">
    <FileText className="h-4 w-4" />
    <span className="font-medium">{postsCount.toLocaleString()}</span>
    <span className="text-gray-500">posts</span>
  </div>
</div>
```

**Visual Example:**
```
┌──────────────────────────────────────┐
│  [Profile Pic]  Page Name            │
│                 ● Active              │
│                                       │
│  👥 1,234 followers  📄 567 posts    │
│                                       │
│  🤖 AI Auto-Response  [Toggle]       │
│                                       │
│  [Delete Button]                     │
└──────────────────────────────────────┘
```

## Meta API Requirements

### Required Permissions

To fetch page statistics, the following Facebook/Meta permissions are required:

#### 1. **pages_show_list** (Required)
- **Purpose:** Allows the app to retrieve the list of Pages managed by the user
- **Permission Type:** Standard Access
- **Required for:** Listing user's pages during OAuth connection

#### 2. **pages_read_engagement** (Required)
- **Purpose:** Allows reading engagement metrics like followers count and post statistics
- **Permission Type:** Standard Access  
- **Required for:** Fetching `followers_count` and `published_posts` data
- **API Fields Enabled:**
  - `followers_count` - Number of people following the page
  - `published_posts` - List/count of published posts

#### 3. **pages_manage_metadata** (Required)
- **Purpose:** Allows reading page profile information and metadata
- **Permission Type:** Standard Access
- **Required for:** Fetching profile picture and basic page info

#### 4. **pages_messaging** (Already Required)
- **Purpose:** Allows sending and receiving messages on behalf of the page
- **Permission Type:** Standard Access (requires App Review)
- **Required for:** Core messaging functionality

### Facebook App Review

Some permissions may require Meta App Review:

1. **Standard Access Permissions** (pages_show_list, pages_read_engagement, pages_manage_metadata)
   - Usually granted immediately for development
   - May require app review for production/public use

2. **App Review Required** (pages_messaging)
   - Required for live/production usage
   - Must demonstrate business use case
   - Usually takes 3-5 business days

### OAuth Scopes Configuration

Update your Facebook OAuth configuration to include these scopes:

```typescript
// src/lib/facebook-oauth.ts
const scopes = [
  'pages_show_list',           // List pages
  'pages_manage_metadata',     // Read page info and profile picture
  'pages_read_engagement',     // Read followers and post statistics ⭐ NEW
  'pages_messaging',           // Manage messages
  'pages_manage_posts',        // Optional: for post management features
];
```

### API Endpoints Used

| Feature | API Endpoint | Required Permission |
|---------|-------------|---------------------|
| Profile Picture | `GET /v23.0/me?fields=picture{url}` | `pages_manage_metadata` |
| Followers Count | `GET /v23.0/me?fields=followers_count` | `pages_read_engagement` |
| Posts Count | `GET /v23.0/me?fields=published_posts.limit(0).summary(true)` | `pages_read_engagement` |

### Testing

#### Development Mode
In Facebook App Development mode:
1. All permissions are available without review
2. Only developers, testers, and admins can connect pages
3. Statistics will be fetched immediately

#### Production Mode
Before going live:
1. Submit app for review with required permissions
2. Demonstrate use case for each permission
3. Provide test accounts and usage instructions
4. Wait for approval (typically 3-5 days)

## Error Handling

The implementation includes graceful error handling:

```typescript
// If statistics fetch fails, continues with null values
try {
  const pageFullData = await facebookAPI.getPageFullData(token);
  followersCount = pageFullData.followersCount;
  postsCount = pageFullData.postsCount;
} catch (error) {
  console.warn('Could not fetch page statistics:', error);
  // Continues without statistics (displays only profile picture)
}
```

## User Experience

### First-Time Connection
1. User clicks "Connect Facebook Page"
2. Facebook OAuth dialog requests permissions
3. User authorizes and selects pages
4. System fetches:
   - ✅ Profile picture
   - ✅ Followers count
   - ✅ Posts count
5. Data saved to database
6. Statistics displayed on manage page

### Subsequent Connections
- Statistics are updated each time the page token is refreshed
- Cached in database for fast display
- Automatically re-fetched when user reconnects

## Performance Considerations

1. **Parallel Fetching:** Profile picture and statistics are fetched in parallel using `Promise.all()`
2. **Caching:** Statistics are stored in database to avoid repeated API calls
3. **Graceful Degradation:** If statistics fetch fails, page still connects successfully
4. **Batch Processing:** Multiple pages can be connected simultaneously

## Future Enhancements

Potential additions:
- 📊 Engagement rate (likes/followers ratio)
- 📈 Growth metrics (follower change over time)
- 📅 Last post date
- ⭐ Average post engagement
- 🕐 Refresh statistics on demand

## Migration Guide

If upgrading from an older version without statistics:

1. **Database Migration:** Run `npx prisma db push` (✅ Already done)
2. **Reconnect Pages:** Users need to reconnect their pages to fetch statistics
3. **Existing Pages:** Will show statistics as null until reconnected

## Troubleshooting

### Statistics Not Showing
1. Check if Facebook App has `pages_read_engagement` permission
2. Verify user granted all requested permissions during OAuth
3. Check server logs for API errors
4. Reconnect the page to refresh data

### Permission Errors
```
Error: (#200) Requires pages_read_engagement permission
```
**Solution:** Add `pages_read_engagement` to OAuth scopes and reconnect

### Zero Counts
- `followersCount: 0` - Page has no followers yet (valid for new pages)
- `postsCount: 0` - Page has no published posts (valid for new pages)
- If page should have data, check permission grants

## Security Considerations

1. **Access Token Storage:** Page access tokens are encrypted before database storage
2. **Permission Scope:** Only requests necessary permissions
3. **Data Privacy:** Statistics are only visible to company members
4. **Rate Limiting:** Facebook API rate limits apply (200 calls/hour/user)

## Summary

✅ **Implemented Features:**
- Profile picture display
- Followers count display  
- Posts count display
- Database persistence
- Graceful error handling
- UI enhancements

🔐 **Required Meta API Permissions:**
- `pages_show_list`
- `pages_manage_metadata`
- `pages_read_engagement` ⭐
- `pages_messaging`

📊 **Data Displayed:**
- Page profile picture
- Followers count (formatted with thousands separator)
- Posts count (formatted with thousands separator)

🚀 **Status:** Production Ready

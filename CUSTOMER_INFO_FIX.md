# Customer Info Fix for Instagram and Chat Widget

## Problem Statement
Customer information was not displaying properly for Instagram and Chat Widget conversations:
1. **Instagram**: Showing generic "Instagram User #xxxx" instead of actual username
2. **Chat Widget**: Not showing customer name and email that were collected during initial form submission
3. **Missing Contact Info**: Email, phone, and address fields not displaying in customer profile sidebar

## Solution Implemented

### 1. API Updates (`src/app/api/conversations/[id]/customer-profile/route.ts`)

#### Widget Profile Enhancement
- Now includes customer email, phone, and address from conversation data
- Uses `customerName` from conversation for better identification
- Falls back to "Website Visitor #xxxx" if no name provided

**Before:**
```typescript
const widgetProfile = {
  id: conversation.psid,
  firstName: "Website",
  lastName: "Visitor",
  fullName: "Website Visitor",
  email: conversation.customerEmail, // Only email
  platform: "widget",
};
```

**After:**
```typescript
const widgetProfile = {
  id: conversation.psid,
  firstName: conversation.customerName?.split(' ')[0] || "Website",
  lastName: conversation.customerName?.split(' ').slice(1).join(' ') || "Visitor",
  fullName: conversation.customerName || `Website Visitor #${conversation.psid.slice(-4)}`,
  email: conversation.customerEmail || undefined,
  phone: conversation.customerPhone || undefined,
  address: conversation.customerAddress || undefined,
  platform: "widget",
  cached: true,
  cachedAt: new Date().toISOString(),
};
```

#### Instagram Profile Enhancement
- Now uses `customerName` from conversation if available
- Includes email, phone, and address fields
- Better fallback naming strategy

**Before:**
```typescript
const instagramProfile = {
  id: conversation.psid,
  firstName: "Instagram User",
  lastName: `${conversation.psid.slice(-4)}`,
  fullName: `Instagram User ${conversation.psid.slice(-4)}`,
  platform: "instagram",
};
```

**After:**
```typescript
const instagramUsername = conversation.customerName || `ig_user_${conversation.psid.slice(-4)}`;
const instagramProfile = {
  id: conversation.psid,
  firstName: instagramUsername.split(' ')[0] || "Instagram",
  lastName: instagramUsername.split(' ').slice(1).join(' ') || "User",
  fullName: instagramUsername,
  email: conversation.customerEmail || undefined,
  phone: conversation.customerPhone || undefined,
  address: conversation.customerAddress || undefined,
  platform: "instagram",
  instagramUrl: `https://www.instagram.com/direct/t/${conversation.psid}`,
  cached: true,
  cachedAt: new Date().toISOString(),
};
```

### 2. CustomerInfoSidebar Updates (`src/components/realtime/CustomerInfoSidebar.tsx`)

#### Platform Badge
- Added platform badge to show conversation source (Website/Instagram/Facebook)

#### Profile Links
- Facebook profile link only shows for Facebook conversations
- Instagram profile link only shows for Instagram conversations
- No broken links for Widget conversations

#### Email Display in Profile
- Customer email now displays in the profile section if available
- Clickable mailto: link
- Separate from the editable contact info section below

**New Features:**
```typescript
// Platform badge
{customerProfile.platform && (
  <Badge variant="outline" className="text-xs mt-1">
    {customerProfile.platform === 'widget' ? 'Website' : 
     customerProfile.platform === 'instagram' ? 'Instagram' : 
     'Facebook'}
  </Badge>
)}

// Conditional profile links
{customerProfile.facebookUrl && (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-600">Facebook Profile</span>
    <a href={customerProfile.facebookUrl} target="_blank">
      <ExternalLink className="h-4 w-4" />
    </a>
  </div>
)}

{customerProfile.instagramUrl && (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-600">Instagram Profile</span>
    <a href={customerProfile.instagramUrl} target="_blank">
      <ExternalLink className="h-4 w-4" />
    </a>
  </div>
)}

// Email in profile section
{customerProfile.email && (
  <div className="flex items-center justify-between pt-2 border-t">
    <span className="text-sm text-gray-600">Email</span>
    <a href={`mailto:${customerProfile.email}`}
       className="text-sm text-blue-600 hover:text-blue-800 truncate max-w-[180px]">
      {customerProfile.email}
    </a>
  </div>
)}
```

## How Customer Data Flows

### For Chat Widget:
1. **Initial Form Submission** (`/api/widget/init`)
   - User enters name, email, and initial message
   - Creates conversation with `customerName` and `customerEmail`
   
2. **Profile Fetch** (`/api/conversations/[id]/customer-profile`)
   - Reads `customerName`, `customerEmail`, `customerPhone`, `customerAddress` from conversation
   - Returns as profile object
   
3. **Display** (`CustomerInfoSidebar.tsx`)
   - Shows name in profile header
   - Shows "Website" platform badge
   - Shows email as clickable mailto link
   - Contact info section allows editing all fields

### For Instagram:
1. **Webhook Receives Message** (`/api/webhook/instagram`)
   - Instagram sends message with sender ID
   - Creates conversation with PSID
   - May have `customerName` if available from Instagram metadata
   
2. **Profile Fetch** (`/api/conversations/[id]/customer-profile`)
   - Uses `customerName` if available, otherwise generates username
   - Returns Instagram profile with contact fields
   
3. **Display** (`CustomerInfoSidebar.tsx`)
   - Shows username/name in profile header
   - Shows "Instagram" platform badge
   - Shows Instagram DM link
   - Contact info section allows adding email/phone/address

### For Facebook:
1. **Webhook Receives Message** (`/api/webhook/facebook`)
   - Facebook sends message with PSID
   - Fetches profile from Facebook Graph API
   - Caches profile in conversation metadata
   
2. **Profile Fetch** (`/api/conversations/[id]/customer-profile`)
   - Uses cached profile or fetches from Facebook API
   - Returns full profile with name, picture, etc.
   
3. **Display** (`CustomerInfoSidebar.tsx`)
   - Shows full name and profile picture
   - Shows "Facebook" platform badge
   - Shows Facebook profile link
   - Contact info section allows adding email/phone/address

## Key Improvements

### ✅ Widget Customer Info
- ✅ Customer name from initial form now displays correctly
- ✅ Email address shows in profile section
- ✅ Platform badge shows "Website"
- ✅ All contact fields (email, phone, address) can be edited

### ✅ Instagram Customer Info
- ✅ Uses actual username from conversation if available
- ✅ Better fallback naming (`ig_user_XXXX` instead of generic)
- ✅ Platform badge shows "Instagram"
- ✅ Instagram DM link provided
- ✅ Contact fields can be added/edited

### ✅ Facebook Customer Info
- ✅ Full profile from Facebook API
- ✅ Profile picture displays
- ✅ Facebook profile link
- ✅ Platform badge shows "Facebook"

### ✅ UI/UX Improvements
- ✅ Platform badges for easy identification
- ✅ Conditional rendering of profile links (no broken links)
- ✅ Email displays in both profile and contact sections
- ✅ Consistent styling across all platforms
- ✅ Better error handling and fallbacks

## Testing

### Test Widget Customer Info:
1. Open widget demo page: `http://localhost:3001/widget-demo.html`
2. Fill out form with name "John Doe" and email "john@example.com"
3. Open conversation in dashboard
4. Click "Customer Info" sidebar
5. **Expected:**
   - Name shows as "John Doe"
   - Email shows as "john@example.com" with mailto link
   - Platform badge shows "Website"
   - No Facebook/Instagram links (only for Widget)

### Test Instagram Customer Info:
1. Send a message from Instagram to your connected account
2. Open conversation in dashboard
3. Click "Customer Info" sidebar
4. **Expected:**
   - Name shows Instagram username if available
   - Platform badge shows "Instagram"
   - Instagram DM link appears
   - Can add email/phone/address in Contact Info section

### Test Facebook Customer Info:
1. Send a message from Facebook Messenger
2. Open conversation in dashboard
3. Click "Customer Info" sidebar
4. **Expected:**
   - Name shows from Facebook profile
   - Profile picture displays
   - Platform badge shows "Facebook"
   - Facebook profile link appears
   - Can add email/phone/address in Contact Info section

## Database Schema

The customer information is stored in the `Conversation` model:

```prisma
model Conversation {
  id                      String    @id @default(cuid())
  psid                    String    // Platform-Scoped ID
  platform                String    // "FACEBOOK" | "INSTAGRAM" | "WIDGET"
  
  // Customer info (stored directly in conversation)
  customerName            String?   // Name from widget form or Instagram
  customerEmail           String?   // Email from widget form or manually added
  customerPhone           String?   // Phone number (manually added)
  customerAddress         String?   // Address (manually added)
  
  // Cached profile data (stored in meta field)
  meta                    Json?     // Contains customerProfile object
  
  // ... other fields
}
```

## API Endpoints

### Get Customer Profile
```
GET /api/conversations/[id]/customer-profile
```

**Response:**
```json
{
  "profile": {
    "id": "psid_12345",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "profilePicture": null,
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St",
    "platform": "widget",
    "facebookUrl": null,
    "instagramUrl": null,
    "cached": true,
    "cachedAt": "2025-01-15T10:30:00Z"
  },
  "source": "widget"
}
```

### Update Contact Info
```
PATCH /api/conversations/[id]
Content-Type: application/json

{
  "customerEmail": "newemail@example.com",
  "customerPhone": "+1234567890",
  "customerAddress": "123 New St"
}
```

## Technical Notes

### Instagram API Limitations
- Instagram Business API doesn't provide user profile access like Facebook
- Username must come from conversation metadata or be manually set
- Best practice: Ask for name in initial message or allow manual entry

### Widget Form Data
- Customer name and email are captured during initial form submission
- Stored directly in conversation record
- Profile API reads from conversation fields

### Caching Strategy
- Profiles are cached in conversation `meta` field
- Cache duration: 24 hours
- Reduces API calls to Facebook/Instagram
- Widget profiles cached immediately after creation

## Future Enhancements

1. **Instagram Username Fetching**
   - Explore Instagram Graph API for username retrieval
   - Consider asking user for Instagram handle in chat

2. **Profile Picture for Widget**
   - Allow users to upload profile picture
   - Use Gravatar based on email

3. **LinkedIn Integration**
   - Add LinkedIn profile linking
   - Fetch profile data from LinkedIn API

4. **Enrichment Services**
   - Integrate with Clearbit/FullContact for email enrichment
   - Automatically fill in company, location, etc.

5. **Customer Timeline**
   - Show interaction history
   - Track profile updates
   - Display engagement metrics

## Files Modified

1. ✅ `src/app/api/conversations/[id]/customer-profile/route.ts`
   - Enhanced Widget profile creation
   - Enhanced Instagram profile creation
   - Added email/phone/address to profile responses

2. ✅ `src/components/realtime/CustomerInfoSidebar.tsx`
   - Added platform badge
   - Conditional rendering of profile links
   - Display email in profile section
   - Improved UI/UX for all platforms

## Conclusion

The customer info system now properly handles all three platforms (Facebook, Instagram, Widget) with appropriate data display and editing capabilities. The fixes ensure that customer names, emails, and other contact information are correctly captured, stored, and displayed in the dashboard.

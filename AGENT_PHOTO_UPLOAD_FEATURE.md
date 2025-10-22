# Agent Profile Photo Upload Feature

## Overview
This feature allows agents to upload their profile photos directly from the Settings page. Photos are stored in Cloudflare R2 (S3-compatible object storage) and displayed throughout the application.

## Changes Made

### 1. Database Schema Updates
**File**: `prisma/schema.prisma`

Added `photoUrl` field to the User model:
```prisma
model User {
  id               String            @id @default(cuid())
  email            String            @unique
  name             String?
  role             Role              @default(AGENT)
  companyId        String?
  photoUrl         String?           // ← NEW FIELD
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
  password         String?
  // ... other fields
}
```

### 2. Cloudflare R2 Integration
**File**: `src/lib/r2.ts` (NEW)

Created utility functions for R2 operations:
- `uploadPhotoToR2()` - Upload photos to R2
- `deletePhotoFromR2()` - Delete photos from R2
- `extractR2KeyFromUrl()` - Extract object key from URL

Features:
- Unique file naming with timestamps
- Organized storage in `user-photos/{userId}/` folders
- Automatic cache headers for optimal performance
- Support for custom domain or default R2 public URL

### 3. API Endpoints
**File**: `src/app/api/settings/profile/photo/route.ts` (NEW)

#### POST `/api/settings/profile/photo`
Upload a new profile photo.

**Request**: `multipart/form-data` with `photo` field
**Validations**:
- File size: Maximum 5MB
- File types: JPEG, JPG, PNG, WebP
- Authentication: Required

**Response**:
```json
{
  "success": true,
  "photoUrl": "https://...",
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "photoUrl": "...",
    "role": "..."
  }
}
```

#### DELETE `/api/settings/profile/photo`
Remove the current profile photo.

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "...",
    "photoUrl": null
  }
}
```

### 4. UI Updates
**File**: `src/app/dashboard/settings/page.tsx`

Replaced "Notification Settings" card with "Profile Photo" card.

**Features**:
- Large avatar preview (128x128px)
- Displays current photo or fallback with initials
- Upload button with hidden file input
- Remove button (only shown when photo exists)
- Photo requirements display
- Loading states during upload/delete
- Success/error alerts
- Session update after photo change

**UI Components Used**:
- `Avatar` / `AvatarImage` / `AvatarFallback`
- File input with `accept` attribute for validation
- Upload and Trash2 icons from lucide-react

### 5. Environment Configuration
**File**: `.env.example`

Added Cloudflare R2 configuration:
```env
# Cloudflare R2 (for file uploads)
CLOUDFLARE_ACCOUNT_ID="your-cloudflare-account-id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-r2-access-key-id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
CLOUDFLARE_R2_BUCKET_NAME="your-bucket-name"
CLOUDFLARE_R2_PUBLIC_URL="https://your-custom-domain.com" # Optional
```

### 6. Dependencies
**File**: `package.json`

Added AWS SDK for S3-compatible storage:
```json
{
  "dependencies": {
    "@aws-sdk/client-s3": "^3.x.x"
  }
}
```

## Setup Instructions

### 1. Create Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to R2 → Create Bucket
3. Name your bucket (e.g., `facebook-bot-user-photos`)
4. Enable public access or configure custom domain

### 2. Generate R2 API Credentials

1. In R2 dashboard, go to "Manage R2 API Tokens"
2. Create API Token with:
   - Name: "Facebook Bot User Photos"
   - Permissions: Object Read & Write
   - Bucket: Select your bucket
3. Copy the Access Key ID and Secret Access Key

### 3. Configure Environment Variables

Add to your `.env` file:
```env
CLOUDFLARE_ACCOUNT_ID="your-account-id"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key-id"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-access-key"
CLOUDFLARE_R2_BUCKET_NAME="facebook-bot-user-photos"
CLOUDFLARE_R2_PUBLIC_URL="https://photos.yourdomain.com" # Optional
```

**Finding your Account ID**:
- Cloudflare Dashboard → R2 → Settings
- Or from the bucket URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/r2/`

### 4. Install Dependencies

```bash
npm install
```

### 5. Update Database Schema

```bash
npm run db:push
```

### 6. Configure R2 Bucket for Public Access

#### Option A: Public Bucket (Default R2 URL)
1. In R2 bucket settings, enable "Public access"
2. Photos will be accessible at: `https://pub-{ACCOUNT_ID}.r2.dev/{key}`

#### Option B: Custom Domain (Recommended)
1. In R2 bucket settings, click "Connect Domain"
2. Add your custom domain (e.g., `photos.yourdomain.com`)
3. Update DNS records as instructed
4. Set `CLOUDFLARE_R2_PUBLIC_URL="https://photos.yourdomain.com"`

### 7. Set CORS Policy (Optional)

If you need to access photos from different domains:

1. In R2 bucket settings, go to "Settings" → "CORS Policy"
2. Add CORS rule:
```json
[
  {
    "AllowedOrigins": ["https://yourdomain.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Usage

### For Users (Agents)

1. Navigate to **Settings** page
2. In the **Profile Photo** card:
   - Click "Upload New Photo"
   - Select an image (JPEG, PNG, or WebP, max 5MB)
   - Wait for upload to complete
   - Photo will appear immediately

To remove a photo:
- Click "Remove Photo" button
- Confirm deletion

### For Developers

#### Upload Photo Programmatically
```typescript
const formData = new FormData();
formData.append("photo", file);

const response = await fetch("/api/settings/profile/photo", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log("Photo URL:", data.photoUrl);
```

#### Access User Photo in Components
```typescript
import { useSession } from "next-auth/react";

function UserAvatar() {
  const { data: session } = useSession();
  
  return (
    <Avatar>
      <AvatarImage src={session?.user?.image || ""} />
      <AvatarFallback>
        {session?.user?.name?.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
```

#### Delete Photo Programmatically
```typescript
const response = await fetch("/api/settings/profile/photo", {
  method: "DELETE",
});

const data = await response.json();
console.log("Photo removed:", data.success);
```

## File Structure

```
src/
├── lib/
│   └── r2.ts                          # R2 utility functions
├── app/
│   ├── api/
│   │   └── settings/
│   │       └── profile/
│   │           └── photo/
│   │               └── route.ts        # Upload/delete API
│   └── dashboard/
│       └── settings/
│           └── page.tsx                # Updated settings UI
prisma/
└── schema.prisma                       # Updated with photoUrl field
```

## Security Considerations

1. **File Size Limit**: 5MB maximum to prevent abuse
2. **File Type Validation**: Only JPEG, PNG, WebP allowed
3. **Authentication Required**: Must be logged in to upload
4. **User Isolation**: Photos stored in user-specific folders
5. **Old Photo Cleanup**: Previous photo deleted on new upload
6. **Access Control**: Users can only upload/delete their own photos

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "R2 is not configured" | Missing environment variables | Add R2 credentials to .env |
| "File too large" | File size > 5MB | Compress or use smaller image |
| "Invalid file type" | Unsupported format | Use JPEG, PNG, or WebP |
| "Failed to upload photo" | R2 connection error | Check credentials and network |
| "Unauthorized" | Not logged in | Ensure valid session |

### Error Logging

All errors are logged with context:
```typescript
console.error("❌ Failed to upload photo to R2:", error);
```

Check server logs for detailed error information.

## Testing

### Manual Testing Checklist

- [ ] Upload JPEG photo
- [ ] Upload PNG photo
- [ ] Upload WebP photo
- [ ] Try uploading file > 5MB (should fail)
- [ ] Try uploading PDF (should fail)
- [ ] Remove uploaded photo
- [ ] Upload new photo (old one should be deleted)
- [ ] Refresh page (photo should persist)
- [ ] Check photo displays in avatar components

### Test Without R2 Configuration

If R2 is not configured, the feature will:
- Show error message: "Photo upload is not configured"
- Return 503 Service Unavailable
- Not crash the application

## Cost Estimation

Cloudflare R2 Pricing (as of 2024):
- **Storage**: $0.015 per GB/month
- **Operations**: 
  - Class A (writes): $4.50 per million requests
  - Class B (reads): $0.36 per million requests
- **Egress**: FREE (unlike S3)

**Example for 1,000 users**:
- Average photo size: 500KB
- Total storage: 500MB = ~$0.01/month
- Uploads (1/month): 1,000 requests = ~$0.005
- Views (100/user/month): 100K requests = ~$0.04

**Total monthly cost**: ~$0.05 for 1,000 users

## Future Enhancements

1. **Image Compression**: Automatically compress images on upload
2. **Image Cropping**: Add crop tool before upload
3. **Multiple Sizes**: Generate thumbnails (32x32, 64x64, 128x128)
4. **Drag & Drop**: Add drag-and-drop upload interface
5. **Progress Bar**: Show upload progress
6. **Admin Controls**: Allow admins to manage user photos
7. **Photo Gallery**: Let users choose from previously uploaded photos
8. **AI Moderation**: Automatic content moderation for uploaded photos

## Troubleshooting

### Photo not displaying after upload
1. Check browser console for errors
2. Verify R2 bucket has public access enabled
3. Check `CLOUDFLARE_R2_PUBLIC_URL` is correct
4. Clear browser cache

### Upload fails silently
1. Check server logs for error messages
2. Verify environment variables are set
3. Test R2 credentials with AWS CLI or SDK
4. Check network connectivity to Cloudflare

### Old photos not being deleted
1. Check R2 bucket permissions (write/delete access)
2. Verify key extraction logic in `extractR2KeyFromUrl()`
3. Check server logs for deletion errors

## Support

For issues or questions:
1. Check server logs: `npm run dev:realtime`
2. Review Cloudflare R2 documentation
3. Test API endpoints with Postman or curl
4. Contact administrator if credentials are needed

## References

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Next.js File Upload](https://nextjs.org/docs/app/building-your-application/routing/route-handlers#formdata)

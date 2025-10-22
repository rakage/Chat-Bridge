# Quick Setup: Cloudflare R2 for Profile Photos

## Step 1: Create Cloudflare R2 Bucket

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Click **R2** in the left sidebar
3. Click **Create bucket**
4. Configure:
   - **Bucket name**: `facebook-bot-user-photos` (or your preferred name)
   - **Location**: Choose closest to your users
5. Click **Create bucket**

## Step 2: Generate API Token

1. In R2 dashboard, click **Manage R2 API Tokens**
2. Click **Create API token**
3. Configure:
   - **Token name**: `Facebook Bot User Photos`
   - **Permissions**: Object Read & Write
   - **TTL**: Not specified (never expires)
   - **Specify bucket**: Select your bucket
4. Click **Create API token**
5. **IMPORTANT**: Copy both:
   - Access Key ID
   - Secret Access Key
   
   ⚠️ You won't be able to see the Secret Access Key again!

## Step 3: Enable Public Access

### Option A: Default R2 Public URL (Quick Setup)

1. Go to your bucket → **Settings**
2. Under **Public access**, click **Allow Access**
3. Confirm the action
4. Your photos will be accessible at:
   ```
   https://pub-{ACCOUNT_ID}.r2.dev/{key}
   ```

### Option B: Custom Domain (Recommended for Production)

1. Go to your bucket → **Settings**
2. Click **Connect Domain**
3. Enter your domain: `photos.yourdomain.com`
4. Follow DNS configuration instructions
5. Wait for DNS propagation (usually 5-30 minutes)
6. Your photos will be accessible at:
   ```
   https://photos.yourdomain.com/{key}
   ```

## Step 4: Configure Environment Variables

1. Open your `.env` file
2. Add the following (replace with your actual values):

```env
# Cloudflare R2 Configuration
CLOUDFLARE_ACCOUNT_ID="abc123def456ghi789"
CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key-id-here"
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-access-key-here"
CLOUDFLARE_R2_BUCKET_NAME="facebook-bot-user-photos"

# Optional: Use custom domain (recommended for production)
CLOUDFLARE_R2_PUBLIC_URL="https://photos.yourdomain.com"

# Or use default R2 URL (for testing)
# CLOUDFLARE_R2_PUBLIC_URL="https://pub-abc123def456ghi789.r2.dev"
```

### Finding Your Account ID

**Method 1**: From URL
- Navigate to R2 in Cloudflare Dashboard
- Look at the URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/r2/`
- The long string is your Account ID

**Method 2**: From R2 Settings
- Go to R2 → Any bucket → Settings
- Account ID is displayed at the top

## Step 5: Test the Setup

1. Restart your development server:
   ```bash
   npm run dev:realtime
   ```

2. Navigate to the Settings page in your app
3. Try uploading a photo:
   - Click "Upload New Photo"
   - Select a JPEG, PNG, or WebP image (max 5MB)
   - Wait for upload to complete
   - Photo should display immediately

4. Check R2 bucket:
   - Go to Cloudflare R2 → Your bucket
   - You should see: `user-photos/{userId}/{timestamp}-{filename}`

## Troubleshooting

### "R2 is not configured"
❌ **Problem**: Environment variables not loaded
✅ **Solution**: 
- Verify `.env` file exists
- Restart dev server after adding variables
- Check for typos in variable names

### "Failed to upload photo"
❌ **Problem**: Invalid credentials or permissions
✅ **Solution**:
- Verify Access Key ID and Secret Access Key
- Ensure API token has "Object Read & Write" permissions
- Check token is assigned to correct bucket

### Photo uploaded but not displaying
❌ **Problem**: Bucket not publicly accessible
✅ **Solution**:
- Enable public access in bucket settings
- If using custom domain, verify DNS is configured
- Check browser console for CORS errors

### "CORS policy" error in browser
❌ **Problem**: CORS not configured
✅ **Solution**:
1. Go to R2 bucket → Settings → CORS policy
2. Add this policy:
```json
[
  {
    "AllowedOrigins": ["http://localhost:3001", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```

## Security Best Practices

### 1. Use Custom Domain in Production
- Default R2 URLs expose your account ID
- Custom domains are more professional and secure

### 2. Limit API Token Permissions
- ✅ Only grant "Object Read & Write"
- ❌ Don't grant "Admin Read & Write"
- Scope to specific bucket only

### 3. Rotate API Tokens Regularly
- Generate new tokens every 90-180 days
- Revoke old tokens after rotation
- Update `.env` with new credentials

### 4. Set Bucket Lifecycle Rules
- Auto-delete orphaned files (photos without user records)
- Archive old photos to reduce costs
- Configure in: R2 bucket → Settings → Lifecycle rules

### 5. Enable Cloudflare Web Analytics
- Monitor bandwidth usage
- Track photo access patterns
- Detect potential abuse

## Cost Monitoring

### Free Tier (as of 2024)
- **Storage**: First 10 GB/month free
- **Operations**: 
  - 1 million Class A (writes) free/month
  - 10 million Class B (reads) free/month
- **Egress**: Unlimited FREE

### Beyond Free Tier
- **Storage**: $0.015 per GB/month
- **Class A operations**: $4.50 per million
- **Class B operations**: $0.36 per million

### Example Calculation (1,000 users)
```
Storage: 1,000 users × 500KB = 500MB = $0.01/month
Uploads: 1,000 photos = 1,000 Class A = $0.005/month
Views: 100,000 views = 100K Class B = $0.04/month
────────────────────────────────────────────────
Total: ~$0.05/month
```

💡 **Tip**: R2 is significantly cheaper than AWS S3!

## Next Steps

1. ✅ R2 is now configured
2. Test photo upload feature
3. Configure custom domain (recommended)
4. Set up monitoring and alerts
5. Review security settings
6. Consider adding image compression

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 Pricing Calculator](https://developers.cloudflare.com/r2/pricing/)
- [R2 Best Practices](https://developers.cloudflare.com/r2/reference/best-practices/)
- [AWS SDK for S3 (R2 Compatible)](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)

## Support

Need help? Check:
1. Cloudflare Community Forum
2. R2 Discord Channel
3. Project documentation: `AGENT_PHOTO_UPLOAD_FEATURE.md`

---

**Last Updated**: 2024

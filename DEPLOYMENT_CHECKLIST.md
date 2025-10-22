# Deployment Checklist: Agent Profile Photo Upload

## Pre-Deployment

### 1. Code Review
- [ ] Review all modified files for security issues
- [ ] Check for hardcoded credentials or secrets
- [ ] Verify error handling is comprehensive
- [ ] Ensure logging doesn't expose sensitive data

### 2. Dependencies
- [ ] Run `npm install` to ensure all packages are installed
- [ ] Verify `@aws-sdk/client-s3` is in package.json
- [ ] Check for any dependency conflicts
- [ ] Run `npm audit` and address critical vulnerabilities

### 3. Database
- [ ] Backup production database before migration
- [ ] Run `npm run db:push` in staging environment first
- [ ] Verify `photoUrl` field added to users table
- [ ] Test rollback procedure if needed

### 4. Environment Variables
- [ ] Add R2 credentials to production `.env` file:
  ```
  CLOUDFLARE_ACCOUNT_ID=
  CLOUDFLARE_R2_ACCESS_KEY_ID=
  CLOUDFLARE_R2_SECRET_ACCESS_KEY=
  CLOUDFLARE_R2_BUCKET_NAME=
  CLOUDFLARE_R2_PUBLIC_URL=
  ```
- [ ] Verify credentials are valid in staging
- [ ] Ensure `.env` is in `.gitignore`
- [ ] Document credentials in secure location (1Password, AWS Secrets, etc.)

## Cloudflare R2 Setup

### 1. Create Bucket
- [ ] Log into Cloudflare Dashboard
- [ ] Create new R2 bucket for production
- [ ] Choose appropriate location/region
- [ ] Document bucket name in team documentation

### 2. Configure Access
- [ ] Generate production API token
- [ ] Set permissions to "Object Read & Write"
- [ ] Scope token to specific bucket
- [ ] Set appropriate TTL (or no expiration)
- [ ] Store credentials securely

### 3. Public Access
**Option A: Default R2 URL (Quick)**
- [ ] Enable public access in bucket settings
- [ ] Test URL: `https://pub-{ACCOUNT_ID}.r2.dev/`

**Option B: Custom Domain (Recommended)**
- [ ] Connect custom domain (e.g., `photos.yourdomain.com`)
- [ ] Update DNS records as instructed
- [ ] Wait for DNS propagation (5-30 minutes)
- [ ] Verify HTTPS is working
- [ ] Update `CLOUDFLARE_R2_PUBLIC_URL` in `.env`

### 4. CORS Configuration
- [ ] Go to bucket Settings → CORS policy
- [ ] Add CORS rules for your domain:
  ```json
  [
    {
      "AllowedOrigins": ["https://yourdomain.com"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3600
    }
  ]
  ```
- [ ] Test CORS from production domain

### 5. Security Settings
- [ ] Review bucket permissions
- [ ] Ensure token has minimal required permissions
- [ ] Set up bucket lifecycle rules (optional)
- [ ] Enable Cloudflare Web Analytics (optional)

## Testing

### Staging Environment
- [ ] Deploy to staging first
- [ ] Test photo upload (JPEG)
- [ ] Test photo upload (PNG)
- [ ] Test photo upload (WebP)
- [ ] Test file size validation (>5MB should fail)
- [ ] Test file type validation (PDF should fail)
- [ ] Test photo removal
- [ ] Test replacing existing photo
- [ ] Verify old photos are deleted from R2
- [ ] Test with missing R2 credentials (should show error)
- [ ] Check server logs for errors
- [ ] Verify photos persist after page refresh
- [ ] Test on multiple browsers
- [ ] Test on mobile devices

### Load Testing (Optional)
- [ ] Test concurrent uploads (10+ users)
- [ ] Monitor R2 API rate limits
- [ ] Check database performance
- [ ] Verify no memory leaks

### Security Testing
- [ ] Test authentication (upload without login should fail)
- [ ] Test authorization (user can't delete other users' photos)
- [ ] Test XSS vulnerabilities in file upload
- [ ] Verify CORS is properly configured
- [ ] Test for SQL injection in API endpoints
- [ ] Check for exposed API tokens in client code

## Deployment

### 1. Pre-Deployment
- [ ] Notify team of deployment window
- [ ] Ensure all tests pass in staging
- [ ] Create deployment plan
- [ ] Prepare rollback plan
- [ ] Tag release in Git: `git tag -a v1.x.x -m "Add agent photo upload"`

### 2. Database Migration
- [ ] Backup production database
- [ ] Run migration: `npm run db:push`
- [ ] Verify migration succeeded
- [ ] Check database for `photoUrl` column

### 3. Application Deployment
- [ ] Deploy code to production
- [ ] Verify environment variables are set
- [ ] Restart application servers
- [ ] Check application logs for errors
- [ ] Verify application is running

### 4. Post-Deployment Verification
- [ ] Visit Settings page
- [ ] Upload a test photo
- [ ] Verify photo displays correctly
- [ ] Check R2 bucket for uploaded file
- [ ] Test photo removal
- [ ] Monitor error logs for 15 minutes
- [ ] Check application performance metrics

### 5. Monitoring Setup
- [ ] Set up monitoring for API endpoints:
  - `/api/settings/profile/photo` (POST)
  - `/api/settings/profile/photo` (DELETE)
- [ ] Configure alerts for:
  - High error rates (>5%)
  - Slow response times (>5s)
  - R2 API failures
- [ ] Monitor R2 bucket storage growth
- [ ] Track upload success/failure rates

## Post-Deployment

### 1. User Communication
- [ ] Announce new feature to team
- [ ] Create user guide or help article
- [ ] Send email to all users about new feature
- [ ] Update user documentation

### 2. Monitoring (First Week)
- [ ] Daily check of error logs
- [ ] Monitor R2 storage usage
- [ ] Track upload success rate
- [ ] Review user feedback
- [ ] Monitor costs in Cloudflare dashboard

### 3. Documentation
- [ ] Update team wiki with feature info
- [ ] Document R2 credentials location
- [ ] Update deployment documentation
- [ ] Create troubleshooting guide for support team

### 4. Performance Review (After 1 Week)
- [ ] Review upload success rate (target: >95%)
- [ ] Check average upload time (target: <3s)
- [ ] Monitor R2 costs vs. estimates
- [ ] Gather user feedback
- [ ] Identify any issues or improvements

## Rollback Plan

### If Issues Are Discovered

**Critical Issues** (app broken, data loss):
1. [ ] Immediately revert code deployment
2. [ ] Restore database backup if needed
3. [ ] Communicate issue to team
4. [ ] Investigate root cause
5. [ ] Fix and re-test in staging

**Minor Issues** (feature not working):
1. [ ] Assess impact (% of users affected)
2. [ ] Create hotfix if possible
3. [ ] If not fixable quickly, disable feature:
   - Remove R2 credentials from `.env`
   - Feature will show "not configured" error
4. [ ] Fix issue and re-deploy

### Rollback Database Migration
```sql
-- If needed, remove photoUrl column
ALTER TABLE users DROP COLUMN IF EXISTS "photoUrl";
```

## Success Criteria

- [ ] ✅ Feature deployed without errors
- [ ] ✅ Users can upload photos successfully
- [ ] ✅ Photos display correctly throughout app
- [ ] ✅ No performance degradation
- [ ] ✅ Error rate <1%
- [ ] ✅ R2 costs within budget
- [ ] ✅ Positive user feedback

## Team Sign-Off

- [ ] Developer: Code complete and tested
- [ ] QA: Testing passed in staging
- [ ] DevOps: Infrastructure ready
- [ ] Product Owner: Approved for deployment
- [ ] Security: Security review completed

## Emergency Contacts

**During Deployment Issues:**
- Developer: [Contact Info]
- DevOps: [Contact Info]
- Cloudflare Support: https://dash.cloudflare.com/support

**For R2 Issues:**
- Cloudflare R2 Status: https://www.cloudflarestatus.com/
- Support Portal: https://dash.cloudflare.com/support

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Sign-Off**: _____________

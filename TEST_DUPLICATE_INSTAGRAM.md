# Testing Duplicate Instagram Connection Prevention

## Purpose

Test that the duplicate Instagram account validation works correctly and shows proper error messages.

---

## Prerequisites

1. **Two companies** - You need access to two companies (e.g., Company A and Company B)
2. **One Instagram account** - Use the same Instagram account for both tests (e.g., @rakaluth)
3. **Fresh state** - Make sure the Instagram account is not already connected

---

## Test Procedure

### Step 1: Connect Instagram to Company A

1. **Make sure you're in Company A:**
   - Check header dropdown → should show Company A as current (green dot)
   - If not, click on Company A to switch

2. **Connect Instagram:**
   ```
   Navigate to: /dashboard/integrations
   Click: "Connect Instagram"
   Login with: @rakaluth
   ```

3. **Verify success:**
   - Should redirect to: `/dashboard/integrations/instagram/manage?success=true`
   - Should see green success message
   - Should see @rakaluth in the list of connected accounts

4. **Check the logs:**
   ```
   💾 Saving Instagram connection for user xxx: @rakaluth
   🏢 User's current company: <COMPANY_A_ID>
   📱 Instagram user ID: <INSTAGRAM_ID>
   ✅ No duplicate found, proceeding to save...
   ✅ Instagram connection saved: @rakaluth (ID: xxx)
   ```

---

### Step 2: Switch to Company B

1. **Switch companies:**
   - Click header dropdown
   - Click on "Company B"
   - Wait for page reload

2. **Verify you switched:**
   - Header should show "Company B"
   - Sidebar should show "Company B"
   - Go to Integrations → should see NO Instagram connections (or different ones)

---

### Step 3: Try to Connect Same Instagram to Company B

1. **Try to connect @rakaluth again:**
   ```
   Navigate to: /dashboard/integrations
   Click: "Connect Instagram"
   Login with: @rakaluth (SAME account as Company A)
   ```

2. **Check the logs (IMPORTANT):**
   ```
   💾 Saving Instagram connection for user xxx: @rakaluth
   🏢 User's current company: <COMPANY_B_ID>
   📱 Instagram user ID: <INSTAGRAM_ID>
   
   SHOULD SEE:
   ❌ Instagram account @rakaluth (ID: xxx) is already connected to another company (<COMPANY_A_ID>)
   ❌ Current user's company: <COMPANY_B_ID>
   ```

3. **Expected behavior:**
   - ✅ Should see RED error message on setup page:
     ```
     "This Instagram account is already connected to another company"
     ```
   - ✅ Should NOT redirect to success page
   - ✅ Should stay on `/dashboard/integrations/instagram/setup`
   - ❌ Should NOT save the connection

4. **Verify NOT saved:**
   - Go to: `/dashboard/integrations/instagram/manage`
   - Should see: **0 Instagram connections** (or no @rakaluth)

---

## Common Issues

### Issue 1: Session Not Updated After Company Switch

**Symptom:**
- Logs show same company ID before and after switch
- `🏢 User's current company:` shows wrong company

**Solution:**
```bash
# Restart the server
pm2 restart chatbridge
# OR
npm run dev:realtime
```

**Then:**
- Hard refresh browser (Ctrl+Shift+R)
- Log out and log back in
- Try again

---

### Issue 2: Instagram ID Changed

**Symptom:**
- Same Instagram account has different ID each time

**Cause:**
- Instagram returns different IDs for different API types
- Business accounts can have multiple IDs

**Solution:**
- Make sure using Instagram Business account (not personal)
- Check logs for consistent `📱 Instagram user ID:`
- If ID is different, it won't detect as duplicate (by design)

---

### Issue 3: Error Not Showing

**Symptom:**
- Validation passes (no error in logs)
- Connection saves successfully
- But appears in wrong company

**Debug:**
```bash
# Check which company the connection was saved to:
# Look at the logs for:
✅ Instagram connection saved: @rakaluth (ID: xxx)
📊 Instagram connection saved to database:
   companyId: <CHECK_THIS_ID>

# Compare with:
🏢 User's current company: <SHOULD_MATCH>
```

**If they don't match:**
- Session is not updated correctly
- The auth.ts fix may not be applied
- Restart server and try again

---

## Expected Log Flow

### Successful First Connection (Company A):

```
🔄 Instagram OAuth callback received
✅ Instagram Business Login successful for @rakaluth
💾 Saving Instagram connection for user xxx: @rakaluth
🏢 User's current company: cmgm4eckm0006v1bk2v7wid7n  ← Company A
📱 Instagram user ID: 17841422459762662
✅ No duplicate found, proceeding to save...
✅ Instagram connection saved: @rakaluth (ID: cmXYZ123)
📊 Instagram connection saved to database:
   companyId: cmgm4eckm0006v1bk2v7wid7n  ← Company A
```

### Failed Duplicate Connection (Company B):

```
🔄 Instagram OAuth callback received
✅ Instagram Business Login successful for @rakaluth
💾 Saving Instagram connection for user xxx: @rakaluth
🏢 User's current company: cmhj2v0d70000v1f4tvqm79ex  ← Company B (different!)
📱 Instagram user ID: 17841422459762662  ← Same Instagram ID
❌ Instagram account @rakaluth (ID: 17841422459762662) is already connected to another company (cmgm4eckm0006v1bk2v7wid7n)
❌ Current user's company: cmhj2v0d70000v1f4tvqm79ex
HTTP 400: { error: "This Instagram account is already connected to another company" }
```

**User sees:**
```
[RED ERROR BANNER]
⚠️ This Instagram account is already connected to another company
```

---

## Quick Verification Commands

### Check Database Directly:

```sql
-- See all Instagram connections
SELECT 
  id, 
  username, 
  "companyId", 
  "instagramUserId",
  "isActive"
FROM instagram_connections
WHERE username = 'rakaluth';

-- Should show:
-- username: rakaluth
-- companyId: <COMPANY_A_ID>
-- instagramUserId: 17841422459762662
```

### Check User's Current Company:

```sql
-- See user's companies
SELECT 
  id,
  email,
  "companyId",           -- Legacy
  "currentCompanyId"     -- New (should be used)
FROM users
WHERE email = 'your@email.com';
```

### Check CompanyMember:

```sql
-- See which companies user belongs to
SELECT 
  cm.id,
  c.name as company_name,
  cm.role,
  cm."joinedAt"
FROM company_members cm
JOIN companies c ON cm."companyId" = c.id
WHERE cm."userId" = '<YOUR_USER_ID>'
ORDER BY cm."joinedAt" DESC;
```

---

## Success Criteria

✅ **Test 1: First connection succeeds**
- Instagram connects to Company A
- Appears in Company A's integration list
- No errors

✅ **Test 2: Duplicate connection fails**
- Instagram OAuth succeeds (gets token)
- Save-connection API returns error 400
- Error message displayed on setup page
- Does NOT redirect to success page
- Does NOT appear in Company B's integration list

✅ **Test 3: Same company re-connect succeeds**
- Disconnect from Company A
- Reconnect to Company A
- Should succeed (same company, allowed)

---

## Troubleshooting

### If error message not showing:

1. **Check browser console:**
   ```javascript
   // Should see network request:
   POST /api/instagram/save-connection
   Status: 400 Bad Request
   Response: { error: "This Instagram account is already connected to another company" }
   ```

2. **Check saveInstagramConnection return value:**
   - Add console.log in setup page
   - Should show: `{ success: false, error: "..." }`

3. **Verify error state:**
   - Check if `setError()` is being called
   - Check if error banner is in the DOM

### If validation not working:

1. **Check Instagram IDs match:**
   - Compare `instagramUserId` in database
   - Compare `📱 Instagram user ID:` in logs
   - Must be exact match

2. **Check company IDs different:**
   - Company A ID ≠ Company B ID
   - `🏢 User's current company:` should differ between tests

3. **Check session.user.companyId:**
   - Must be using `currentCompanyId` (from auth.ts fix)
   - Restart server if auth changes not applied

---

## Summary

The validation will work if:
1. ✅ Same `instagramUserId`
2. ✅ Different `companyId`
3. ✅ `isActive = true`
4. ✅ Session uses `currentCompanyId`
5. ✅ Setup page handles error response

**If all logs match the expected patterns above, the error message SHOULD display.**

If it's still not working, share:
1. Complete logs from both connection attempts
2. Database query results
3. Browser console network tab for `/api/instagram/save-connection`

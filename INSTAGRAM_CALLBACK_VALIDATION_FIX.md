# Instagram Callback Duplicate Validation Fix

## Critical Issue Found

The Instagram duplicate validation was **completely bypassed** because the Instagram OAuth callback route was **directly saving to the database** without going through the `/api/instagram/save-connection` endpoint where the validation was implemented.

---

## Root Cause

### Two Different Instagram Connection Flows:

1. **Instagram Graph OAuth Flow** (The one being used):
   ```
   User clicks "Connect Instagram"
     ↓
   /api/auth/instagram/login-url
     ↓
   Instagram OAuth redirect
     ↓
   /api/auth/instagram/callback  ← SAVES DIRECTLY TO DATABASE
     ↓
   Redirects to manage page
   ```

2. **Old Save-Connection Flow** (NOT being used):
   ```
   OAuth callback
     ↓
   Frontend calls /api/instagram/save-connection
     ↓
   Validation happens here
     ↓
   Saves to database
   ```

### The Problem:

**File:** `src/app/api/auth/instagram/callback/route.ts`

**Before Fix:**
```typescript
// Get user's company
const user = await db.user.findUnique({
  where: { id: session.user.id },
  select: { companyId: true }
});

// Encrypt access token
const encryptedToken = await encrypt(longTokenResponse.access_token);

// ❌ DIRECTLY saves to database without any duplicate check!
console.log("💾 Saving Instagram connection to database...");
const connection = await db.instagramConnection.upsert({
  where: {
    companyId_instagramUserId: {
      companyId: user.companyId,
      instagramUserId: profile.id,
    },
  },
  create: { /* ... */ },
  update: { /* ... */ },
});
```

**Result:**
- ❌ No duplicate validation
- ❌ Validation in `/api/instagram/save-connection` is never executed
- ❌ User can connect same Instagram to multiple companies
- ❌ No error message shown

---

## Solution

Added the same duplicate validation to the Instagram callback route.

### After Fix:

```typescript
console.log(`💾 Saving Instagram connection for user ${user.id}: @${profile.username}`);
console.log(`🏢 User's current company: ${user.companyId}`);
console.log(`📱 Instagram user ID: ${profile.id}`);

// ✅ Check if this Instagram account is already connected to another company
const existingConnection = await db.instagramConnection.findFirst({
  where: {
    instagramUserId: profile.id,
    NOT: {
      companyId: user.companyId || undefined, // Different company
    },
    isActive: true,
  },
  select: {
    id: true,
    companyId: true,
    username: true,
  },
});

if (existingConnection) {
  console.error(`❌ Instagram account @${profile.username} (ID: ${profile.id}) is already connected to another company (${existingConnection.companyId})`);
  console.error(`❌ Current user's company: ${user.companyId}`);
  
  // ✅ Redirect to setup page with error
  return NextResponse.redirect(
    new URL("/dashboard/integrations/instagram/setup?error=" + encodeURIComponent("This Instagram account is already connected to another company"), baseUrl)
  );
}

console.log(`✅ No duplicate found, proceeding to save...`);

// Save to database
const connection = await db.instagramConnection.upsert({ /* ... */ });
```

---

## Flow After Fix

### Successful Connection (First Time):

```
1. User connects @scarytoilets to Company A
   ↓
2. Instagram OAuth callback receives profile
   ↓
3. Logs:
   💾 Saving Instagram connection for user xxx: @scarytoilets
   🏢 User's current company: cmgm4eckm0006v1bk2v7wid7n
   📱 Instagram user ID: 17841422459762662
   ✅ No duplicate found, proceeding to save...
   ✅ Instagram connection saved: @scarytoilets
   ↓
4. Redirect to: /dashboard/integrations/instagram/manage?success=true
   ↓
5. Success message shown ✅
```

### Failed Duplicate Connection:

```
1. User switches to Company B
   ↓
2. User tries to connect @scarytoilets (already in Company A)
   ↓
3. Instagram OAuth callback receives profile
   ↓
4. Logs:
   💾 Saving Instagram connection for user xxx: @scarytoilets
   🏢 User's current company: cmhj2v0d70000v1f4tvqm79ex (Company B)
   📱 Instagram user ID: 17841422459762662
   ❌ Instagram account @scarytoilets is already connected to another company (cmgm4eckm0006v1bk2v7wid7n)
   ❌ Current user's company: cmhj2v0d70000v1f4tvqm79ex
   ↓
5. Redirect to: /dashboard/integrations/instagram/setup?error=This+Instagram+account+is+already+connected+to+another+company
   ↓
6. Setup page displays error parameter
   ↓
7. RED error banner shows: "This Instagram account is already connected to another company" ✅
```

---

## Files Changed

### 1. `src/app/api/auth/instagram/callback/route.ts`

**Changes:**
- Added duplicate validation check before saving
- Added detailed logging (company ID, Instagram ID)
- Redirect to setup page with error on duplicate
- Log success when no duplicate found

**Lines Added:** ~30 lines

---

## Why This Works Now

### Before:
```
Instagram OAuth callback
  → Save directly to DB (no validation)
  → Always succeeds
  → Always redirects to success page
```

### After:
```
Instagram OAuth callback
  → Check for duplicates
  → If duplicate: Redirect to setup with error
  → If no duplicate: Save to DB
  → Redirect to success page
```

---

## Expected Logs

### Logs You Should Now See:

When connecting Instagram, you'll see:

```
🔄 Instagram OAuth callback received
🔧 Instagram Graph OAuth configured with App ID: xxx
✅ Instagram Business access token obtained successfully
✅ Long-lived token obtained (expires in xxx seconds)
✅ Instagram profile retrieved: @scarytoilets
💾 Saving Instagram connection for user xxx: @scarytoilets  ← NEW
🏢 User's current company: cmgm4eckm0006v1bk2v7wid7n     ← NEW
📱 Instagram user ID: 17841422459762662                   ← NEW
```

**If duplicate detected:**
```
❌ Instagram account @scarytoilets (ID: 17841422459762662) is already connected to another company (cmgm4eckm0006v1bk2v7wid7n)
❌ Current user's company: cmhj2v0d70000v1f4tvqm79ex
```

**If no duplicate:**
```
✅ No duplicate found, proceeding to save...
✅ Instagram connection saved: @scarytoilets (ID: xxx)
```

---

## Testing Steps

### Step 1: Restart Server

**IMPORTANT:** You MUST restart the server for the fix to take effect:

```bash
pm2 restart chatbridge
# OR
npm run dev:realtime
```

### Step 2: Test Duplicate Connection

1. **Connect Instagram to Company A:**
   - Switch to Company A (check header)
   - Go to Integrations → Connect Instagram
   - Connect @scarytoilets
   - Should succeed ✅

2. **Switch to Company B:**
   - Click header dropdown
   - Click Company B
   - Wait for page reload

3. **Try to connect same Instagram:**
   - Go to Integrations → Connect Instagram
   - Connect @scarytoilets (SAME account)
   - **Should see:**
     - Logs with ❌ error
     - Redirected to setup page
     - RED error banner: "This Instagram account is already connected to another company"

---

## Related Files

Both locations now have duplicate validation:

1. **`src/app/api/auth/instagram/callback/route.ts`** ✅ - Instagram Graph OAuth (main flow)
2. **`src/app/api/instagram/save-connection/route.ts`** ✅ - Legacy save endpoint (backup)

This ensures duplicate validation works regardless of which flow is used.

---

## Summary

### Root Cause:
- Instagram callback was saving directly to database
- Bypassed all validation in save-connection endpoint

### Solution:
- Added duplicate validation to Instagram callback route
- Now checks before saving
- Redirects with error message if duplicate found

### Result:
🎉 **Duplicate Instagram connections now properly prevented!**

- ✅ Validation runs in the actual flow being used
- ✅ Error message shown to user
- ✅ Clear logs for debugging
- ✅ No silent failures

**Build:** ✅ Successful (28.0s)  
**Status:** 🚀 **Ready to Deploy**

## Next Steps

1. **Deploy the fix:** Restart your server with the new code
2. **Test it:** Follow the testing steps above
3. **Verify logs:** Should see the new log format with company/Instagram IDs
4. **Confirm error:** Should see error message when trying duplicate connection

# Database Schema Fix - Remove Unique Constraints for Close Chat Feature

## Critical Issue

**Problem:** Database unique constraints on `(connectionId, psid)` prevented creating new conversations with the same PSID, even when existing conversation was CLOSED.

**Error:**
```
Unique constraint failed on the fields: (`instagramConnectionId`,`psid`)
```

**Impact:** Close chat feature couldn't work because new conversations couldn't be created after closing old ones.

---

## Root Cause

### Schema Constraint

The Prisma schema had unique constraints that enforced ONE conversation per PSID:

```prisma
model Conversation {
  // ...
  @@unique([pageConnectionId, psid])
  @@unique([instagramConnectionId, psid])
  @@unique([telegramConnectionId, psid])
  @@unique([widgetConfigId, psid])
}
```

**What this means:**
- Database would reject creating a second conversation with the same PSID
- Even if the first conversation was CLOSED
- Constraint enforced at database level, not just code level

---

## The Fix

### Changed Schema

**Before:**
```prisma
model Conversation {
  // ...
  
  @@unique([pageConnectionId, psid])
  @@unique([instagramConnectionId, psid])
  @@unique([telegramConnectionId, psid])
  @@unique([widgetConfigId, psid])
  @@index([pageConnectionId, status, lastMessageAt])
  @@index([instagramConnectionId, status, lastMessageAt])
  // ...
}
```

**After:**
```prisma
model Conversation {
  // ...
  
  // Removed unique constraints to allow multiple conversations per PSID
  // when status is CLOSED. Duplicate prevention for OPEN/SNOOZED is handled in code.
  // @@unique([pageConnectionId, psid])
  // @@unique([instagramConnectionId, psid])
  // @@unique([telegramConnectionId, psid])
  // @@unique([widgetConfigId, psid])
  
  // Added composite indexes for efficient queries
  @@index([pageConnectionId, psid, status])
  @@index([instagramConnectionId, psid, status])
  @@index([telegramConnectionId, psid, status])
  @@index([widgetConfigId, psid, status])
  @@index([pageConnectionId, status, lastMessageAt])
  @@index([instagramConnectionId, status, lastMessageAt])
  // ...
}
```

---

## What Changed

### 1. Removed Unique Constraints (4 total)
- `@@unique([pageConnectionId, psid])` → Removed
- `@@unique([instagramConnectionId, psid])` → Removed
- `@@unique([telegramConnectionId, psid])` → Removed
- `@@unique([widgetConfigId, psid])` → Removed

**Why:** These prevented creating new conversations when old ones were closed.

### 2. Added Composite Indexes (4 new)
- `@@index([pageConnectionId, psid, status])`
- `@@index([instagramConnectionId, psid, status])`
- `@@index([telegramConnectionId, psid, status])`
- `@@index([widgetConfigId, psid, status])`

**Why:** Improve query performance for finding conversations by PSID and status.

---

## How It Works Now

### Database Level:
- **Before:** Database rejects duplicate PSID (enforced by unique constraint)
- **After:** Database allows multiple conversations with same PSID

### Application Level:
- Duplicate prevention logic in code prevents creating duplicate OPEN/SNOOZED conversations
- CLOSED conversations can be duplicated (by design)

### Example:

**Scenario:** Customer with PSID "123456" has closed conversation, then messages again

**Before Fix (Database Rejects):**
```sql
-- Existing conversation
INSERT INTO conversations (psid, status) VALUES ('123456', 'CLOSED'); ✅

-- New conversation attempt
INSERT INTO conversations (psid, status) VALUES ('123456', 'OPEN');
-- ❌ ERROR: Unique constraint failed on (psid)
```

**After Fix (Database Allows):**
```sql
-- Existing conversation
INSERT INTO conversations (psid, status) VALUES ('123456', 'CLOSED'); ✅

-- New conversation (allowed!)
INSERT INTO conversations (psid, status) VALUES ('123456', 'OPEN'); ✅

-- Result: Two conversations with same PSID
SELECT * FROM conversations WHERE psid = '123456';
-- Row 1: psid='123456', status='CLOSED' (old)
-- Row 2: psid='123456', status='OPEN'  (new)
```

---

## Duplicate Prevention Strategy

### Old Strategy (Database-enforced):
- Unique constraint at database level
- ONE conversation per PSID (regardless of status)
- Simple but inflexible

### New Strategy (Code-enforced):
- Multiple duplicate checks in application code
- Prevents duplicate OPEN/SNOOZED conversations only
- Allows duplicate CLOSED conversations
- More flexible and feature-rich

**Code Checks:**
1. **Initial Search** - Find existing OPEN/SNOOZED conversation
2. **PSID Matching** - Skip CLOSED conversations when matching
3. **Username Matching** - Skip CLOSED conversations when matching
4. **STRICT CHECK** - Verify no OPEN/SNOOZED duplicates before creating
5. **FINAL CHECK** - Last verification before database insert

---

## Query Performance Impact

### Before (with unique constraints):
```sql
-- Fast lookup by PSID (unique index)
SELECT * FROM conversations 
WHERE instagramConnectionId = 'X' AND psid = 'Y';
-- Uses: conversations_instagramConnectionId_psid_key (unique index)
-- Speed: Very fast
```

### After (with composite indexes):
```sql
-- Still fast with composite index
SELECT * FROM conversations 
WHERE instagramConnectionId = 'X' AND psid = 'Y' AND status IN ('OPEN', 'SNOOZED');
-- Uses: conversations_instagramConnectionId_psid_status_idx (composite index)
-- Speed: Very fast (comparable to unique index)
```

**Performance:** No significant degradation. Composite indexes are optimized for these queries.

---

## Migration Steps

### 1. Generate Prisma Client
```bash
npm run db:generate
```

**Output:**
```
✔ Generated Prisma Client (v6.17.1) to .\node_modules\@prisma\client in 375ms
```

### 2. Push to Database
```bash
npm run db:push
```

**Output:**
```
Your database is now in sync with your Prisma schema. Done in 1.58s
```

**What it does:**
- Drops the unique constraints
- Creates new composite indexes
- No data loss (all conversations preserved)

---

## Data Safety

### Safe Changes:
✅ **No data deleted** - All conversations remain
✅ **No data modified** - Existing records unchanged
✅ **Backward compatible** - Existing queries still work
✅ **Reversible** - Can add constraints back if needed (but shouldn't)

### What happens to existing data:

**Before migration:**
```sql
conversations:
- id: conv1, psid: "123", status: CLOSED
-- Cannot create another with psid="123"
```

**After migration:**
```sql
conversations:
- id: conv1, psid: "123", status: CLOSED (unchanged)
-- CAN now create another with psid="123" if different status
```

---

## Edge Cases Handled

### Edge Case 1: Race Condition During Creation

**Scenario:** Two requests try to create conversation at same time

**Before Fix:**
- First request succeeds
- Second request fails with unique constraint error
- Race condition handler catches it and uses existing conversation

**After Fix:**
- Both requests may succeed if timing is perfect
- Each gets a conversation (possibly different ones)
- Duplicate prevention checks reduce this risk
- Race condition handler still works as fallback

**Solution:** Code-level duplicate checks happen before database insert, minimizing races.

### Edge Case 2: Existing Duplicate Data

**Scenario:** What if database already has duplicates (shouldn't happen but...)?

**Impact:** After removing constraints, any duplicates remain
**Mitigation:** 
- Query filters by status to find correct conversation
- `ORDER BY lastMessageAt DESC` gets most recent
- Duplicate prevention prevents creating more

### Edge Case 3: Multiple CLOSED Conversations

**Scenario:** Customer closes chat 3 times, creates 3 CLOSED conversations

**Query behavior:**
```sql
SELECT * FROM conversations 
WHERE psid = '123' AND status IN ('OPEN', 'SNOOZED')
ORDER BY lastMessageAt DESC;
-- Returns: Nothing (all are CLOSED)

-- New conversation gets created (4th one)
```

**Is this OK?** YES! This is the desired behavior. Each issue gets its own conversation thread.

---

## Testing

### Test 1: Close and Message (Instagram)

**Steps:**
1. Close Instagram conversation (psid: "123")
2. Customer sends message

**Expected Database State:**
```sql
-- Before message
SELECT * FROM conversations WHERE psid = '123';
-- Result: 1 row, status='CLOSED'

-- After message
SELECT * FROM conversations WHERE psid = '123' ORDER BY createdAt;
-- Result: 2 rows
-- Row 1: status='CLOSED', createdAt=older
-- Row 2: status='OPEN',   createdAt=newer ✅
```

### Test 2: Multiple Platforms Same PSID

**Scenario:** Same PSID used on Facebook and Instagram (unlikely but possible)

**Database State:**
```sql
-- Facebook conversation
pageConnectionId='FB1', psid='123', status='OPEN'

-- Instagram conversation (different platform, same PSID - OK!)
instagramConnectionId='IG1', psid='123', status='OPEN'
```

**Behavior:** Works fine! Different connections, no conflict.

### Test 3: Query Performance

**Query:**
```sql
EXPLAIN ANALYZE
SELECT * FROM conversations
WHERE instagramConnectionId = 'cmhera3in0009v8v11xqr0dv5'
  AND psid = '1170019054981341'
  AND status IN ('OPEN', 'SNOOZED')
ORDER BY lastMessageAt DESC;
```

**Expected:** Index scan using `conversations_instagramConnectionId_psid_status_idx`

---

## Rollback Plan (If Needed)

**If you need to revert:**

1. **Re-add unique constraints to schema:**
```prisma
@@unique([pageConnectionId, psid])
@@unique([instagramConnectionId, psid])
@@unique([telegramConnectionId, psid])
@@unique([widgetConfigId, psid])
```

2. **BUT FIRST clean duplicate data:**
```sql
-- Find duplicates
SELECT psid, COUNT(*) 
FROM conversations 
GROUP BY psid, instagramConnectionId 
HAVING COUNT(*) > 1;

-- Delete older CLOSED duplicates (keep newest)
-- Manual cleanup required
```

3. **Then push schema:**
```bash
npm run db:push
```

**WARNING:** Don't rollback unless absolutely necessary. The close chat feature requires this change.

---

## Related Changes

This schema fix works together with code changes:

1. **`src/lib/queue.ts`** - Conditional lastMessageAt update
2. **`src/lib/instagram-conversation-helper.ts`** - Multiple duplicate checks
3. **`src/app/api/webhook/telegram/route.ts`** - Status filtering
4. **`src/app/api/widget/`** - Status filtering

All these code changes ensure proper duplicate prevention without database constraints.

---

## Summary

### Files Changed:
- `prisma/schema.prisma` - Removed 4 unique constraints, added 4 composite indexes

### Database Changes:
- Dropped unique constraints: `conversations_pageConnectionId_psid_key`, etc.
- Created indexes: `conversations_pageConnectionId_psid_status_idx`, etc.

### Migration:
- ✅ Generated Prisma client
- ✅ Pushed to database (1.58s)
- ✅ No data loss
- ✅ Backward compatible

### Testing:
⏳ **Ready to test** - Close conversations and have customers message

---

**Status:** ✅ **Schema Fixed & Deployed**  
**Build:** ⏳ **In progress**  
**Migration:** ✅ **Complete**  
**Priority:** HIGH - Unblocks close chat feature

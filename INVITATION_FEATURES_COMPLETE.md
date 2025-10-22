# ✅ Invitation System Enhanced - Max Uses & Pause/Start

## 🎯 New Features Added

### **1. Maximum Uses Per Invitation**
- Set how many people can use a single invitation code (1-100)
- Track usage count in real-time
- Automatic status update when max uses reached
- Display: "3/5 uses" badge on each invitation

### **2. Pause/Start Invitations**
- Toggle invitations active/inactive status
- Paused invitations cannot be used
- Visual indicator: "PAUSED" badge and reduced opacity
- Quick toggle with "Pause" / "Start" button

---

## 📊 Database Changes

### **New Fields in `company_invitations` Table:**

```sql
- isActive     BOOLEAN   DEFAULT true   -- Toggle on/off
- maxUses      INTEGER   DEFAULT 1      -- Maximum number of uses (1-100)
- usedCount    INTEGER   DEFAULT 0      -- Current usage count
```

### **Migration Applied:**
✅ Database schema updated
✅ Prisma client regenerated
✅ All existing invitations default to: `isActive: true`, `maxUses: 1`, `usedCount: 0`

---

## 🔧 API Updates

### **1. Create Invitation** (`POST /api/companies/invitations/create`)

**New Parameter:**
```json
{
  "email": "user@example.com",  // Optional
  "expiresInDays": 7,
  "maxUses": 5                   // NEW: Default 1, Max 100
}
```

**Response includes:**
```json
{
  "invitation": {
    "code": "abc123...",
    "maxUses": 5,
    "usedCount": 0,
    "isActive": true
  }
}
```

---

### **2. Validate Invitation** (`POST /api/companies/invitations/validate`)

**New Checks:**
- ✅ Checks if invitation is active (`isActive: true`)
- ✅ Checks if max uses reached (`usedCount < maxUses`)
- ✅ Returns remaining uses info

**Response includes:**
```json
{
  "invitation": {
    "maxUses": 5,
    "usedCount": 2,
    "remainingUses": 3
  }
}
```

**Error Messages:**
- `"This invitation has been paused"` - When `isActive: false`
- `"This invitation has reached its maximum number of uses"` - When `usedCount >= maxUses`

---

### **3. Accept Invitation** (`POST /api/companies/invitations/accept`)

**Behavior:**
- Increments `usedCount` by 1
- Marks as `ACCEPTED` only when fully used (`usedCount >= maxUses`)
- Multi-use invitations stay `PENDING` until fully used

**Example Flow:**
```
maxUses: 3
User 1 accepts → usedCount: 1, status: PENDING
User 2 accepts → usedCount: 2, status: PENDING
User 3 accepts → usedCount: 3, status: ACCEPTED ✓
```

---

### **4. Toggle Invitation** (`POST /api/companies/invitations/[id]/toggle`) **NEW!**

**Toggles invitation active status**

**Request:**
```
POST /api/companies/invitations/abc123/toggle
```

**Response:**
```json
{
  "success": true,
  "isActive": false  // New status
}
```

**Permissions:** ADMIN and OWNER only

---

### **5. List Invitations** (`GET /api/companies/invitations`)

**Response now includes:**
```json
{
  "invitations": [
    {
      "id": "inv_123",
      "code": "abc123...",
      "isActive": true,
      "maxUses": 5,
      "usedCount": 2,
      "status": "PENDING"
    }
  ]
}
```

---

## 🎨 UI Updates

### **Create Invitation Form:**

```
┌─────────────────────────────────────────────┐
│ Email Address (Optional)                    │
│ [user@example.com____________________]      │
│ Leave empty for a general invitation code   │
│                                             │
│ Maximum Uses          Expires In (Days)     │
│ [5__]                 [7__]                 │
│ How many people can   Default: 7, Max: 30   │
│ use this code                               │
│                                             │
│ [🔑 Create Invitation]                      │
└─────────────────────────────────────────────┘
```

**New Field:**
- **Maximum Uses** - Number input (1-100)
- Default value: 1
- Help text: "How many people can use this code (Max: 100)"

---

### **Invitation List Display:**

```
┌──────────────────────────────────────────────────────┐
│ abc123def456    [PENDING]  [PAUSED]  [2/5 uses]     │
│ 📧 john@example.com                                  │
│ 📅 Expires: Jan 27, 2025                             │
│                             [Pause] [Copy Link ✓]    │
├──────────────────────────────────────────────────────┤
│ xyz789ghi012    [PENDING]  [3/10 uses]              │
│ 📅 Expires: Feb 1, 2025                              │
│                             [Pause] [Copy Link]      │
└──────────────────────────────────────────────────────┘
```

**New UI Elements:**

1. **Usage Badge:**
   - Shows: `"2/5 uses"`
   - Outlined badge style
   - Updates in real-time

2. **Paused Badge:**
   - Shows: `"PAUSED"` (gray badge)
   - Only visible when `isActive: false`
   - Invitation card has reduced opacity (60%)

3. **Pause/Start Button:**
   - Shows "Pause" when active
   - Shows "Start" when paused
   - Loading spinner while toggling
   - Only visible for PENDING invitations

4. **Button Layout:**
   - Pause/Start button on the left
   - Copy Link button on the right
   - Both buttons only show for PENDING status

---

## 🔒 Security & Validation

### **Server-Side Validation:**

1. **Max Uses Limits:**
   - Minimum: 1
   - Maximum: 100
   - Validated in API schema

2. **Toggle Permissions:**
   - Only ADMIN and OWNER can pause/start
   - Must own the invitation (same company)

3. **Accept Validation:**
   - Checks `isActive` status
   - Checks `usedCount < maxUses`
   - Atomic increment (thread-safe)

4. **Status Management:**
   - Auto-marks as ACCEPTED when fully used
   - Prevents accepting paused invitations
   - Prevents accepting full invitations

---

## 📊 Use Cases

### **Use Case 1: Team Onboarding**
```
Create invitation with maxUses: 10
Share with 10 new team members
Track progress: "7/10 uses"
Automatically closes when full
```

### **Use Case 2: Event Registration**
```
Create invitation with maxUses: 50
Share link in event email
Monitor registrations in real-time
Pause if event is full early
```

### **Use Case 3: Temporary Access**
```
Create invitation with maxUses: 1, expires: 1 day
Share with contractor
Pause immediately if not needed
Auto-expires after 24 hours
```

### **Use Case 4: Department Access**
```
Create invitation with maxUses: 20
Label with email: sales@company.com
Pause during holidays
Resume when needed
```

---

## 🧪 Testing

### **Test Create with Max Uses:**
```bash
curl -X POST http://localhost:3000/api/companies/invitations/create \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{
    "email": "team@company.com",
    "expiresInDays": 7,
    "maxUses": 5
  }'
```

### **Test Toggle Invitation:**
```bash
curl -X POST http://localhost:3000/api/companies/invitations/INV_ID/toggle \
  -H "Cookie: session=..."
```

### **Test Validation with Paused:**
1. Create invitation
2. Pause it via toggle
3. Try to validate/accept
4. Should get: "This invitation has been paused"

### **Test Max Uses:**
1. Create invitation with maxUses: 3
2. Accept with User 1 → usedCount: 1, status: PENDING
3. Accept with User 2 → usedCount: 2, status: PENDING
4. Accept with User 3 → usedCount: 3, status: ACCEPTED
5. Try User 4 → Error: "maximum number of uses"

---

## 🎨 Visual Indicators

### **Invitation States:**

| State | Badge | Opacity | Buttons |
|-------|-------|---------|---------|
| Active, not full | PENDING + uses badge | 100% | Pause + Copy |
| Paused | PENDING + PAUSED + uses | 60% | Start + Copy |
| Fully used | ACCEPTED + uses (full) | 100% | None |
| Expired | EXPIRED | 100% | None |

---

## 📈 Benefits

### **1. Better Resource Management**
- Control team size growth
- Limit concurrent onboarding
- Track invitation effectiveness

### **2. Improved Security**
- Pause suspicious invitations instantly
- Prevent unauthorized access
- Audit invitation usage

### **3. Enhanced Flexibility**
- Reuse invitation codes for multiple people
- Temporary pause instead of deletion
- Clear visibility of usage status

### **4. Better UX**
- Real-time usage tracking
- Visual feedback (badges, opacity)
- Quick toggle controls

---

## 🔄 Migration Steps

**Already completed automatically:**

```bash
✅ npx prisma db push
✅ Prisma client regenerated
✅ Database updated with new fields
```

**All existing invitations:**
- `isActive: true` (active by default)
- `maxUses: 1` (single-use by default)
- `usedCount: 0` (not used yet)

---

## 📝 API Summary

| Endpoint | Method | Feature | Permission |
|----------|--------|---------|------------|
| `/api/companies/invitations/create` | POST | Create with maxUses | ADMIN, OWNER |
| `/api/companies/invitations/validate` | POST | Check active & uses | User |
| `/api/companies/invitations/accept` | POST | Increment usedCount | User |
| `/api/companies/invitations/[id]/toggle` | POST | Pause/Start | ADMIN, OWNER |
| `/api/companies/invitations` | GET | List with usage data | ADMIN, OWNER |

---

## 🎉 Summary

### **What Was Added:**

✅ **Max Uses Per Invitation**
- Create invitations for 1-100 people
- Track usage count in real-time
- Auto-close when fully used

✅ **Pause/Start Functionality**
- Toggle invitations on/off
- Visual indicators (badges, opacity)
- Quick control buttons

✅ **Enhanced UI**
- Usage badges (e.g., "3/5 uses")
- Pause/Start toggle buttons
- Visual feedback for paused state

✅ **Improved Security**
- Prevent paused invitation usage
- Enforce max uses limits
- Permission-based toggle control

### **Files Updated:**

**Database:**
1. ✏️ `prisma/schema.prisma` - Added 3 new fields

**API Endpoints:**
2. ✏️ `src/app/api/companies/invitations/create/route.ts` - Accept maxUses
3. ✏️ `src/app/api/companies/invitations/validate/route.ts` - Check active & uses
4. ✏️ `src/app/api/companies/invitations/accept/route.ts` - Increment usedCount
5. ✨ `src/app/api/companies/invitations/[id]/toggle/route.ts` - **NEW** toggle endpoint
6. ✏️ `src/app/api/companies/invitations/route.ts` - Include new fields

**UI:**
7. ✏️ `src/app/dashboard/company/page.tsx` - Enhanced UI with controls

---

## 🚀 Ready to Use!

**Your invitation system now supports:**
- ✅ Multi-use invitation codes
- ✅ Real-time usage tracking
- ✅ Pause/Start controls
- ✅ Visual status indicators
- ✅ Better resource management

**Start creating invitations with max uses and try the pause/start feature!** 🎊

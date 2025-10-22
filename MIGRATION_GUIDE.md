# 🔄 Database Migration Guide

## ⚠️ Important: Run This Migration First!

The company invitation system requires a database migration to add the `company_invitations` table.

---

## 🚀 Quick Migration

Run **ONE** of these commands:

### **Option 1: Using Prisma (Recommended)**
```bash
npx prisma db push
```

### **Option 2: Using SQL Directly**
```bash
# PostgreSQL
psql $DATABASE_URL -f prisma/migrations/add_company_invitations.sql

# Or if you have connection details
psql -h your-host -U your-user -d your-database -f prisma/migrations/add_company_invitations.sql
```

---

## 🔍 Verify Migration

After running the migration, verify the table was created:

### **Using Prisma Studio:**
```bash
npx prisma studio
```
Then check if `company_invitations` table exists.

### **Using SQL:**
```sql
-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'company_invitations';

-- Check table structure
\d company_invitations
```

---

## 📊 What Gets Created

The migration adds the `company_invitations` table with:

### **Columns:**
- `id` - Unique identifier
- `code` - Invitation code (unique, 32-character hex)
- `companyId` - Company the invitation is for
- `email` - Optional: specific email for invitation
- `invitedByUserId` - Who created the invitation
- `acceptedByUserId` - Who accepted (null if pending)
- `status` - PENDING, ACCEPTED, EXPIRED, or REVOKED
- `expiresAt` - When the invitation expires
- `acceptedAt` - When it was accepted (null if pending)
- `createdAt` - When invitation was created
- `updatedAt` - Last update timestamp

### **Relations:**
- Company → CompanyInvitations (one-to-many)
- User → CompanyInvitations (created invitations)
- User → CompanyInvitations (accepted invitations)

### **Indexes:**
- Unique index on `code`
- Index on `companyId` (for fast company lookups)
- Index on `email` (for email-specific invitations)
- Index on `status` (for filtering by status)
- Index on `invitedByUserId` (for tracking who invited)

---

## 🐛 Troubleshooting

### **Error: "Cannot read properties of undefined (reading 'findMany')"**

**Problem:** The `company_invitations` table doesn't exist yet.

**Solution:** Run the migration:
```bash
npx prisma db push
```

### **Error: "Table already exists"**

**Problem:** Migration was already run.

**Solution:** Nothing to do! Your database is up to date.

### **Error: "prisma command not found"**

**Problem:** Prisma CLI not installed.

**Solution:** 
```bash
npm install -D prisma
# Then run migration
npx prisma db push
```

### **Error: "Connection refused" or "Can't connect to database"**

**Problem:** Database connection issue.

**Solution:** 
1. Check your `.env` file has correct `DATABASE_URL`
2. Verify database is running
3. Test connection:
```bash
npx prisma db pull
```

### **Error: "Permission denied"**

**Problem:** Database user doesn't have CREATE TABLE permissions.

**Solution:** Grant permissions:
```sql
GRANT CREATE ON DATABASE your_database TO your_user;
GRANT ALL PRIVILEGES ON SCHEMA public TO your_user;
```

---

## 📝 Manual Migration (If Needed)

If automatic migration fails, run this SQL manually:

```sql
-- Create enum for invitation status
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- Create company_invitations table
CREATE TABLE "company_invitations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_invitations_pkey" PRIMARY KEY ("id")
);

-- Create unique index on code
CREATE UNIQUE INDEX "company_invitations_code_key" ON "company_invitations"("code");

-- Create indexes for performance
CREATE INDEX "company_invitations_companyId_idx" ON "company_invitations"("companyId");
CREATE INDEX "company_invitations_email_idx" ON "company_invitations"("email");
CREATE INDEX "company_invitations_status_idx" ON "company_invitations"("status");
CREATE INDEX "company_invitations_invitedByUserId_idx" ON "company_invitations"("invitedByUserId");

-- Add foreign key constraints
ALTER TABLE "company_invitations" 
  ADD CONSTRAINT "company_invitations_companyId_fkey" 
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_invitations" 
  ADD CONSTRAINT "company_invitations_invitedByUserId_fkey" 
  FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_invitations" 
  ADD CONSTRAINT "company_invitations_acceptedByUserId_fkey" 
  FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") 
  ON DELETE SET NULL ON UPDATE CASCADE;
```

---

## ✅ Post-Migration Checklist

After running the migration:

- [ ] Verify table exists: `npx prisma studio`
- [ ] Restart your development server
- [ ] Go to `/dashboard/company`
- [ ] Try creating an invitation
- [ ] Check invitations list loads without errors
- [ ] Test accepting an invitation

---

## 🔄 Development Workflow

### **During Development:**
```bash
# After changing schema.prisma
npx prisma db push

# Generate Prisma Client
npx prisma generate

# Restart dev server
npm run dev
```

### **For Production:**
```bash
# Create migration
npx prisma migrate dev --name add_company_invitations

# Apply to production
npx prisma migrate deploy
```

---

## 📊 Rollback (If Needed)

If you need to rollback the migration:

```sql
-- Drop table and enum
DROP TABLE IF EXISTS "company_invitations" CASCADE;
DROP TYPE IF EXISTS "InvitationStatus";
```

Then remove from `schema.prisma`:
- `CompanyInvitation` model
- `InvitationStatus` enum
- Relations in `Company` and `User` models

---

## 🆘 Still Having Issues?

1. **Check Prisma version:**
```bash
npx prisma --version
```

2. **Check database connection:**
```bash
npx prisma db pull
```

3. **Reset database (⚠️ DELETES ALL DATA):**
```bash
npx prisma migrate reset
```

4. **Check logs:**
```bash
# Check your app logs for Prisma errors
# Look for "PrismaClientKnownRequestError" messages
```

5. **Verify schema is correct:**
```bash
npx prisma validate
```

---

## 📚 Learn More

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Push Docs](https://www.prisma.io/docs/reference/api-reference/command-reference#db-push)
- [PostgreSQL Table Creation](https://www.postgresql.org/docs/current/sql-createtable.html)

---

## 🎉 Success!

Once the migration is complete:
- ✅ No more errors when loading `/dashboard/company`
- ✅ Can create invitations
- ✅ Can view invitation list
- ✅ Invitation system fully functional

**Happy inviting!** 🔑

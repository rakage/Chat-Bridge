-- Create CompanyInvitation table
CREATE TABLE "company_invitations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT,
    "invitedByUserId" TEXT NOT NULL,
    "acceptedByUserId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
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
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

/**
 * Data Migration Script: Single Company → Multi-Company
 * 
 * This script migrates existing users from the old single-company model
 * to the new multi-company model with CompanyMember junction table.
 * 
 * What it does:
 * 1. For each user with a companyId:
 *    - Create CompanyMember record (role: OWNER if they created it, MEMBER otherwise)
 *    - Set currentCompanyId = companyId
 * 2. Preserves old companyId for backward compatibility
 * 
 * Usage: node scripts/migrate-to-multi-company.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function migrateToMultiCompany() {
  console.log('🚀 Starting migration to multi-company model...\n');

  try {
    // Get all users with a company
    const usersWithCompany = await prisma.user.findMany({
      where: {
        companyId: {
          not: null
        }
      },
      select: {
        id: true,
        email: true,
        companyId: true,
        role: true,
      }
    });

    console.log(`📊 Found ${usersWithCompany.length} users with companies\n`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of usersWithCompany) {
      try {
        console.log(`Processing user: ${user.email} → Company: ${user.companyId}`);

        // Check if CompanyMember already exists
        const existingMembership = await prisma.companyMember.findUnique({
          where: {
            userId_companyId: {
              userId: user.id,
              companyId: user.companyId
            }
          }
        });

        if (existingMembership) {
          console.log(`  ⏭️  Membership already exists, skipping...`);
          skippedCount++;
          continue;
        }

        // Determine role: OWNER if user has OWNER role, otherwise MEMBER
        const companyRole = user.role === 'OWNER' ? 'OWNER' : 'MEMBER';

        // Create CompanyMember record
        await prisma.companyMember.create({
          data: {
            userId: user.id,
            companyId: user.companyId,
            role: companyRole,
          }
        });

        // Set currentCompanyId to match their existing company
        await prisma.user.update({
          where: { id: user.id },
          data: {
            currentCompanyId: user.companyId
          }
        });

        console.log(`  ✅ Created membership with role: ${companyRole}`);
        migratedCount++;

      } catch (error) {
        console.error(`  ❌ Error migrating user ${user.email}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`⏭️  Skipped (already exists): ${skippedCount} users`);
    console.log(`❌ Errors: ${errorCount} users`);
    console.log('='.repeat(60) + '\n');

    if (migratedCount > 0) {
      console.log('🎉 Migration completed successfully!');
      console.log('\n📝 Next steps:');
      console.log('1. Run: npm run db:push (to apply schema changes to database)');
      console.log('2. Test company switching in the dashboard');
      console.log('3. Verify all users can see their companies\n');
    }

  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateToMultiCompany()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

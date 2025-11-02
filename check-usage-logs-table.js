const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkUsageLogsTable() {
  try {
    console.log('Checking if usage_logs table exists...\n');
    
    // Try to query the usage_logs table
    const count = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'usage_logs'
    `;
    
    if (count[0].count > 0) {
      console.log('✅ usage_logs table EXISTS in database');
      
      // Check if UsageType enum exists
      const enumCheck = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'UsageType'
        ) as exists
      `;
      
      if (enumCheck[0].exists) {
        console.log('✅ UsageType enum EXISTS in database');
      } else {
        console.log('❌ UsageType enum DOES NOT EXIST in database');
      }
      
      // Try to count records
      try {
        const records = await prisma.usageLog.count();
        console.log(`✅ Found ${records} records in usage_logs table`);
      } catch (err) {
        console.log('⚠️  Could not query usage_logs:', err.message);
      }
    } else {
      console.log('❌ usage_logs table DOES NOT EXIST in database');
      console.log('\nYou need to run the migration SQL manually.');
    }
    
  } catch (error) {
    console.error('Error checking table:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsageLogsTable();

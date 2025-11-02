const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testUsageLogging() {
  try {
    console.log('Testing usage log creation...\n');
    
    // Get the first company
    const company = await prisma.company.findFirst();
    
    if (!company) {
      console.log('❌ No company found in database');
      return;
    }
    
    console.log(`✅ Found company: ${company.name} (${company.id})`);
    
    // Try to create a test usage log
    console.log('\nCreating test usage log...');
    const usageLog = await prisma.usageLog.create({
      data: {
        companyId: company.id,
        type: "TRAINING",
        provider: "OPENAI",
        model: "text-embedding-3-small",
        inputTokens: 100,
        outputTokens: 0,
        totalTokens: 100,
        metadata: {
          test: true,
          note: "This is a test log entry"
        }
      }
    });
    
    console.log('✅ Successfully created usage log:', {
      id: usageLog.id,
      type: usageLog.type,
      provider: usageLog.provider,
      totalTokens: usageLog.totalTokens,
      createdAt: usageLog.createdAt
    });
    
    // Query all logs
    const allLogs = await prisma.usageLog.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    
    console.log(`\n✅ Total usage logs for this company: ${allLogs.length}`);
    allLogs.forEach(log => {
      console.log(`  - ${log.type}: ${log.totalTokens} tokens (${log.provider}/${log.model})`);
    });
    
    // Clean up test log
    console.log('\nCleaning up test log...');
    await prisma.usageLog.delete({
      where: { id: usageLog.id }
    });
    console.log('✅ Test log deleted');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testUsageLogging();

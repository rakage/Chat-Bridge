const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkEmbeddings() {
  try {
    console.log('🔍 Checking document chunks and embeddings...\n');

    // Get chunk count
    const chunks = await prisma.documentChunk.findMany({
      where: {
        companyId: 'cmfl07q6p0000v1xsfmtdtxgd',
      },
      select: {
        id: true,
        content: true,
        metadata: true,
      },
      take: 5,
    });

    console.log(`📊 Found ${chunks.length} chunks (showing first 5):\n`);

    chunks.forEach((chunk, i) => {
      console.log(`${i + 1}. ${chunk.content.substring(0, 100)}...`);
      console.log(`   Metadata:`, chunk.metadata);
      console.log('');
    });

    // Count total
    const total = await prisma.documentChunk.count({
      where: {
        companyId: 'cmfl07q6p0000v1xsfmtdtxgd',
      },
    });

    console.log(`✅ Total chunks for company: ${total}`);

    // Check if embeddings exist
    const withEmbedding = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM document_chunks 
      WHERE "companyId" = 'cmfl07q6p0000v1xsfmtdtxgd' 
      AND embedding IS NOT NULL
    `;

    console.log(`📊 Chunks with embeddings: ${withEmbedding[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmbeddings();

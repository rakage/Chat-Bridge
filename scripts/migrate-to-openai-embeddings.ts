import { db } from '../src/lib/db';
import EmbeddingService from '../src/lib/embeddings';

async function migrateToOpenAI() {
  console.log('🔄 Starting migration to OpenAI embeddings (text-embedding-3-small)...\n');
  
  // Check if API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set in environment variables!');
    console.error('Please add OPENAI_API_KEY to your .env file');
    process.exit(1);
  }

  // Test OpenAI connection first
  console.log('🧪 Testing OpenAI API connection...');
  try {
    const testResult = await EmbeddingService.generateEmbedding('test');
    console.log(`✅ OpenAI API working! Embedding dimensions: ${testResult.embedding.length}`);
    console.log(`   Model: text-embedding-3-small\n`);
  } catch (error) {
    console.error('❌ Failed to connect to OpenAI API:');
    console.error(error);
    process.exit(1);
  }

  // Get all document chunks
  const chunks = await db.documentChunk.findMany({
    select: {
      id: true,
      content: true,
      documentId: true,
    },
    orderBy: { id: 'asc' },
  });

  if (chunks.length === 0) {
    console.log('ℹ️  No document chunks found. Nothing to migrate.');
    process.exit(0);
  }

  console.log(`📊 Found ${chunks.length} chunks to migrate\n`);

  // Estimate cost
  const totalTokens = chunks.reduce((sum, chunk) => {
    return sum + EmbeddingService.estimateTokenCount(chunk.content);
  }, 0);
  const estimatedCost = (totalTokens / 1_000_000) * 0.02; // $0.02 per 1M tokens

  console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)} (${totalTokens.toLocaleString()} tokens)\n`);
  
  // Process chunks in batches for better performance
  const BATCH_SIZE = 50; // Process 50 chunks at a time
  const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
  
  let processed = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
    const start = batchNum * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, chunks.length);
    const batchChunks = chunks.slice(start, end);

    console.log(`📦 Processing batch ${batchNum + 1}/${totalBatches} (chunks ${start + 1}-${end})`);

    try {
      // Generate embeddings for the batch
      const texts = batchChunks.map(chunk => chunk.content);
      const result = await EmbeddingService.generateEmbeddings(texts);

      // Update database with new embeddings
      for (let i = 0; i < batchChunks.length; i++) {
        try {
          await db.documentChunk.update({
            where: { id: batchChunks[i].id },
            data: { embedding: result.embeddings[i] },
          });
          processed++;
        } catch (updateError) {
          console.error(`   ❌ Failed to update chunk ${batchChunks[i].id}:`, updateError);
          errors++;
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (processed / (Date.now() - startTime) * 1000).toFixed(1);
      const remaining = chunks.length - processed;
      const eta = remaining > 0 ? ((remaining / parseFloat(rate)) / 60).toFixed(1) : '0';

      console.log(`   ✅ Processed ${processed}/${chunks.length} chunks`);
      console.log(`   ⏱️  Elapsed: ${elapsed}s | Rate: ${rate} chunks/sec | ETA: ${eta} min\n`);

      // Small delay to avoid rate limiting (OpenAI allows 3,000 RPM on free tier)
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (error) {
      console.error(`   ❌ Batch ${batchNum + 1} failed:`, error);
      errors += batchChunks.length;
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const avgTime = (parseFloat(totalTime) / processed).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary:');
  console.log('='.repeat(60));
  console.log(`✅ Successfully migrated: ${processed} chunks`);
  console.log(`❌ Errors: ${errors} chunks`);
  console.log(`⏱️  Total time: ${totalTime}s (${avgTime}s per chunk)`);
  console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)}`);
  console.log(`📈 New embedding dimensions: 1536 (OpenAI text-embedding-3-small)`);
  console.log('='.repeat(60));

  if (errors > 0) {
    console.log('\n⚠️  Some chunks failed to migrate. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n✨ Migration complete! All chunks successfully migrated to OpenAI embeddings.');
    process.exit(0);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('\n❌ Unhandled error:', error);
  process.exit(1);
});

// Run migration
migrateToOpenAI()
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

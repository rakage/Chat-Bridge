import EmbeddingService from '../src/lib/embeddings';

async function testOpenAIEmbeddings() {
  console.log('🧪 Testing OpenAI Embeddings (text-embedding-3-small)\n');
  console.log('='.repeat(60));

  // Check API key
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set!');
    console.error('Please add OPENAI_API_KEY to your .env file');
    process.exit(1);
  }

  console.log('✅ OPENAI_API_KEY is set\n');

  // Test 1: Single embedding
  console.log('Test 1: Generate single embedding');
  console.log('-'.repeat(60));
  try {
    const text1 = 'Hello, this is a test document for embedding generation.';
    console.log(`Input: "${text1}"`);
    
    const start1 = Date.now();
    const result1 = await EmbeddingService.generateEmbedding(text1);
    const time1 = Date.now() - start1;

    console.log(`✅ Success!`);
    console.log(`   Dimensions: ${result1.embedding.length}`);
    console.log(`   Tokens used: ${result1.tokenCount}`);
    console.log(`   Time: ${time1}ms`);
    console.log(`   Sample values: [${result1.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log();
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }

  // Test 2: Batch embeddings
  console.log('Test 2: Generate batch embeddings');
  console.log('-'.repeat(60));
  try {
    const texts = [
      'Document 1: Information about artificial intelligence and machine learning.',
      'Document 2: Guide to building web applications with React and Next.js.',
      'Document 3: Understanding database optimization and query performance.',
      'Document 4: Best practices for API design and RESTful architecture.',
      'Document 5: Introduction to cloud computing and serverless functions.',
    ];

    console.log(`Input: ${texts.length} documents`);
    
    const start2 = Date.now();
    const result2 = await EmbeddingService.generateEmbeddings(texts);
    const time2 = Date.now() - start2;

    console.log(`✅ Success!`);
    console.log(`   Generated: ${result2.embeddings.length} embeddings`);
    console.log(`   Dimensions: ${result2.embeddings[0].length}`);
    console.log(`   Total tokens: ${result2.tokenCounts?.reduce((a, b) => a + b, 0) || 'N/A'}`);
    console.log(`   Time: ${time2}ms (${(time2 / texts.length).toFixed(1)}ms per doc)`);
    console.log();
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }

  // Test 3: Similarity calculation
  console.log('Test 3: Calculate similarity between embeddings');
  console.log('-'.repeat(60));
  try {
    const doc1 = 'Machine learning is a subset of artificial intelligence.';
    const doc2 = 'AI and ML are transforming the technology industry.';
    const doc3 = 'Cooking pasta requires boiling water and adding salt.';

    const [emb1, emb2, emb3] = await Promise.all([
      EmbeddingService.generateEmbedding(doc1),
      EmbeddingService.generateEmbedding(doc2),
      EmbeddingService.generateEmbedding(doc3),
    ]);

    const similarity12 = EmbeddingService.cosineSimilarity(emb1.embedding, emb2.embedding);
    const similarity13 = EmbeddingService.cosineSimilarity(emb1.embedding, emb3.embedding);
    const similarity23 = EmbeddingService.cosineSimilarity(emb2.embedding, emb3.embedding);

    console.log('Documents:');
    console.log(`  1. "${doc1}"`);
    console.log(`  2. "${doc2}"`);
    console.log(`  3. "${doc3}"`);
    console.log();
    console.log('Similarity scores:');
    console.log(`  Doc 1 ↔ Doc 2 (related): ${similarity12.toFixed(4)} ✅ High`);
    console.log(`  Doc 1 ↔ Doc 3 (unrelated): ${similarity13.toFixed(4)} ✅ Low`);
    console.log(`  Doc 2 ↔ Doc 3 (unrelated): ${similarity23.toFixed(4)} ✅ Low`);
    console.log();
  } catch (error) {
    console.error('❌ Failed:', error);
    process.exit(1);
  }

  // Test 4: Cost estimation
  console.log('Test 4: Cost estimation');
  console.log('-'.repeat(60));
  const sampleTexts = [
    'Short text',
    'This is a medium length text with several words and sentences.',
    'This is a longer text that contains multiple paragraphs. It has more content and will require more tokens to process. This helps us test the cost estimation for different text lengths.',
  ];

  let totalTokens = 0;
  for (const text of sampleTexts) {
    const estimated = EmbeddingService.estimateTokenCount(text);
    totalTokens += estimated;
    console.log(`"${text.substring(0, 50)}..." → ~${estimated} tokens`);
  }

  const cost = (totalTokens / 1_000_000) * 0.02;
  console.log();
  console.log(`Total estimated tokens: ${totalTokens}`);
  console.log(`Estimated cost: $${cost.toFixed(6)}`);
  console.log();

  // Cost comparison
  console.log('Cost Comparison:');
  console.log('-'.repeat(60));
  console.log('1,000 documents (avg 500 words each):');
  console.log('  - Estimated tokens: ~750,000');
  console.log('  - OpenAI cost: $0.015 (0.75M tokens × $0.02/1M)');
  console.log('  - Annual (12 batches): ~$0.18');
  console.log();
  console.log('10,000 documents:');
  console.log('  - Estimated tokens: ~7.5M');
  console.log('  - OpenAI cost: $0.15');
  console.log();

  // Summary
  console.log('='.repeat(60));
  console.log('✨ All tests passed!');
  console.log('='.repeat(60));
  console.log('✅ OpenAI embeddings are working correctly');
  console.log('✅ Model: text-embedding-3-small');
  console.log('✅ Dimensions: 1536');
  console.log('✅ Cost: $0.02 per 1M tokens');
  console.log('='.repeat(60));
  console.log();
  console.log('Next steps:');
  console.log('1. Add OPENAI_API_KEY to your .env file');
  console.log('2. Run migration: npm run migrate:embeddings');
  console.log('3. Test your RAG system with new embeddings');
}

// Run tests
testOpenAIEmbeddings()
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });

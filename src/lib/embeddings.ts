import OpenAI from "openai";

export interface EmbeddingResult {
  embedding: number[];
  tokenCount?: number;
}

export interface EmbeddingBatch {
  inputs: string[];
  embeddings: number[][];
  tokenCounts?: number[];
}

export class EmbeddingService {
  private static readonly MODEL_NAME = "text-embedding-3-small"; // OpenAI embedding model
  private static readonly MAX_BATCH_SIZE = 100; // OpenAI supports up to 2048 inputs per request
  private static readonly MAX_INPUT_LENGTH = 8191; // Max tokens per input for text-embedding-3-small

  /**
   * Get OpenAI client instance with provided or default API key
   */
  private static getOpenAIClient(apiKey?: string): OpenAI {
    const key = apiKey || process.env.OPENAI_API_KEY || "";
    return new OpenAI({ apiKey: key });
  }

  /**
   * Generate embedding for a single text input
   * @param text - The text to generate embedding for
   * @param apiKey - Optional OpenAI API key (falls back to env variable)
   */
  static async generateEmbedding(
    text: string,
    apiKey?: string
  ): Promise<EmbeddingResult> {
    const effectiveKey = apiKey || process.env.OPENAI_API_KEY;
    if (!effectiveKey) {
      throw new Error("OpenAI API key is required (provide key or set OPENAI_API_KEY environment variable)");
    }

    try {
      // Truncate text if too long
      const truncatedText = this.truncateText(text);

      const openai = this.getOpenAIClient(apiKey);
      const response = await openai.embeddings.create({
        model: this.MODEL_NAME,
        input: truncatedText,
        encoding_format: "float",
      });

      if (!response.data || response.data.length === 0) {
        throw new Error("No embedding returned from OpenAI API");
      }

      return {
        embedding: response.data[0].embedding,
        tokenCount: response.usage?.total_tokens || this.estimateTokenCount(truncatedText),
      };
    } catch (error) {
      console.error("OpenAI embedding error:", error);
      throw new Error(
        `Failed to generate embedding: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate embeddings for multiple text inputs (OpenAI supports batch requests)
   * @param texts - Array of texts to generate embeddings for
   * @param apiKey - Optional OpenAI API key (falls back to env variable)
   */
  static async generateEmbeddings(
    texts: string[],
    apiKey?: string
  ): Promise<EmbeddingBatch> {
    if (texts.length === 0) {
      return { inputs: [], embeddings: [] };
    }

    const effectiveKey = apiKey || process.env.OPENAI_API_KEY;
    if (!effectiveKey) {
      throw new Error("OpenAI API key is required (provide key or set OPENAI_API_KEY environment variable)");
    }

    try {
      // Truncate all texts
      const truncatedTexts = texts.map(text => this.truncateText(text));

      // OpenAI supports batch embedding requests
      const batches = this.chunkArray(truncatedTexts, this.MAX_BATCH_SIZE);
      const allEmbeddings: number[][] = [];
      const allTokenCounts: number[] = [];

      const openai = this.getOpenAIClient(apiKey);

      for (const batch of batches) {
        const response = await openai.embeddings.create({
          model: this.MODEL_NAME,
          input: batch,
          encoding_format: "float",
        });

        if (!response.data || response.data.length === 0) {
          throw new Error("No embeddings returned from OpenAI API");
        }

        // OpenAI returns embeddings in the same order as inputs
        allEmbeddings.push(...response.data.map((item) => item.embedding));
        
        // Distribute total tokens across all inputs
        const tokensPerInput = response.usage?.total_tokens 
          ? Math.ceil(response.usage.total_tokens / batch.length)
          : 0;
        allTokenCounts.push(...batch.map(() => tokensPerInput));
      }

      return {
        inputs: texts,
        embeddings: allEmbeddings,
        tokenCounts: allTokenCounts,
      };
    } catch (error) {
      console.error("OpenAI batch embedding error:", error);
      throw new Error(
        `Failed to generate batch embeddings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error("Embeddings must have the same length");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find most similar embeddings from a collection
   */
  static findMostSimilar(
    queryEmbedding: number[],
    embeddings: { id: string; embedding: number[]; metadata?: any }[],
    topK: number = 5,
    threshold: number = 0.7
  ): Array<{ id: string; similarity: number; metadata?: any }> {
    const similarities = embeddings.map((item) => ({
      id: item.id,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding),
      metadata: item.metadata,
    }));

    return similarities
      .filter((item) => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Truncate text to fit within model limits
   */
  private static truncateText(text: string): string {
    // OpenAI text-embedding-3-small supports up to 8191 tokens
    // Rough estimate: 1 token ≈ 4 characters for English text
    const maxChars = this.MAX_INPUT_LENGTH * 4; // ~32,764 characters
    return text.length > maxChars ? text.substring(0, maxChars) : text;
  }

  /**
   * Split array into chunks of specified size
   */
  private static chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  static estimateTokenCount(text: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Clean and prepare text for embedding
   */
  static preprocessText(text: string): string {
    return text
      .replace(/\s+/g, " ") // Normalize whitespace
      .replace(/\n{3,}/g, "\n\n") // Limit consecutive newlines
      .trim();
  }
}

export default EmbeddingService;

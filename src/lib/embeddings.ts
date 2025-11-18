import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";

export interface EmbeddingResult {
  embedding: number[];
  tokenCount?: number;
}

export interface EmbeddingBatch {
  inputs: string[];
  embeddings: number[][];
  tokenCounts?: number[];
}

export type EmbeddingProvider = "OPENAI" | "GEMINI";

export class EmbeddingService {
  private static readonly OPENAI_MODEL = "text-embedding-3-small";
  private static readonly GEMINI_EMBEDDING_MODEL = "text-embedding-004"; // Gemini embedding model
  private static readonly MAX_BATCH_SIZE = 100;
  private static readonly MAX_INPUT_LENGTH = 8191;

  /**
   * Get OpenAI client instance with provided or default API key
   */
  private static getOpenAIClient(apiKey?: string): OpenAI {
    const key = apiKey || process.env.OPENAI_API_KEY || "";
    return new OpenAI({ apiKey: key });
  }

  /**
   * Get Gemini client instance with provided API key
   */
  private static getGeminiClient(apiKey: string): GoogleGenerativeAI {
    return new GoogleGenerativeAI(apiKey);
  }

  /**
   * Generate embedding for a single text input
   * @param text - The text to generate embedding for
   * @param apiKey - API key for the provider
   * @param provider - The embedding provider to use (OPENAI or GEMINI)
   * @param model - Optional: Specific model to use for embeddings
   */
  static async generateEmbedding(
    text: string,
    apiKey?: string,
    provider: EmbeddingProvider = "OPENAI",
    model?: string
  ): Promise<EmbeddingResult> {
    if (provider === "GEMINI") {
      return this.generateGeminiEmbedding(text, apiKey, model);
    }
    
    // Default to OpenAI
    const effectiveKey = apiKey || process.env.OPENAI_API_KEY;
    if (!effectiveKey) {
      throw new Error("OpenAI API key is required (provide key or set OPENAI_API_KEY environment variable)");
    }

    try {
      // Truncate text if too long
      const truncatedText = this.truncateText(text);

      const openai = this.getOpenAIClient(apiKey);
      const response = await openai.embeddings.create({
        model: model || this.OPENAI_MODEL,
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
        `Failed to generate OpenAI embedding: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate embedding using Gemini
   * @param text - The text to generate embedding for
   * @param apiKey - Gemini API key
   * @param modelName - Optional: Specific Gemini model to use
   */
  private static async generateGeminiEmbedding(
    text: string,
    apiKey?: string,
    modelName?: string
  ): Promise<EmbeddingResult> {
    const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
    if (!effectiveKey) {
      throw new Error("Gemini API key is required");
    }

    try {
      const truncatedText = this.truncateText(text);
      const genAI = this.getGeminiClient(effectiveKey);
      const model = genAI.getGenerativeModel({ model: modelName || this.GEMINI_EMBEDDING_MODEL });

      const result = await model.embedContent(truncatedText);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error("No embedding returned from Gemini API");
      }

      return {
        embedding: result.embedding.values,
        tokenCount: this.estimateTokenCount(truncatedText),
      };
    } catch (error) {
      console.error("Gemini embedding error:", error);
      throw new Error(
        `Failed to generate Gemini embedding: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate embeddings for multiple text inputs
   * @param texts - Array of texts to generate embeddings for
   * @param apiKey - API key for the provider
   * @param provider - The embedding provider to use (OPENAI or GEMINI)
   * @param model - Optional: Specific model to use for embeddings
   */
  static async generateEmbeddings(
    texts: string[],
    apiKey?: string,
    provider: EmbeddingProvider = "OPENAI",
    model?: string
  ): Promise<EmbeddingBatch> {
    if (texts.length === 0) {
      return { inputs: [], embeddings: [] };
    }

    if (provider === "GEMINI") {
      return this.generateGeminiEmbeddings(texts, apiKey, model);
    }

    // Default to OpenAI
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
          model: model || this.OPENAI_MODEL,
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
        `Failed to generate OpenAI batch embeddings: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts using Gemini (processes sequentially)
   * @param texts - Array of texts to generate embeddings for
   * @param apiKey - Gemini API key
   * @param modelName - Optional: Specific Gemini model to use
   */
  private static async generateGeminiEmbeddings(
    texts: string[],
    apiKey?: string,
    modelName?: string
  ): Promise<EmbeddingBatch> {
    const effectiveKey = apiKey || process.env.GEMINI_API_KEY;
    if (!effectiveKey) {
      throw new Error("Gemini API key is required");
    }

    try {
      const truncatedTexts = texts.map(text => this.truncateText(text));
      const genAI = this.getGeminiClient(effectiveKey);
      const model = genAI.getGenerativeModel({ model: modelName || this.GEMINI_EMBEDDING_MODEL });

      const allEmbeddings: number[][] = [];
      const allTokenCounts: number[] = [];

      // Gemini processes embeddings one at a time
      for (const text of truncatedTexts) {
        const result = await model.embedContent(text);
        
        if (!result.embedding || !result.embedding.values) {
          throw new Error("No embedding returned from Gemini API");
        }

        allEmbeddings.push(result.embedding.values);
        allTokenCounts.push(this.estimateTokenCount(text));
      }

      return {
        inputs: texts,
        embeddings: allEmbeddings,
        tokenCounts: allTokenCounts,
      };
    } catch (error) {
      console.error("Gemini batch embedding error:", error);
      throw new Error(
        `Failed to generate Gemini batch embeddings: ${
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

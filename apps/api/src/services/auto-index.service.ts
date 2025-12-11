/**
 * AutoIndexService - Self-Learning RAG: Automatic Content Indexing
 *
 * Automatically indexes discovered documentation content into Qdrant + Supabase.
 * Includes content hash deduplication and background queue processing.
 */

import crypto from "crypto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import { QdrantService, QdrantPoint } from "./qdrant.service.js";

// Types
interface PageToIndex {
  url: string;
  title: string;
  content: string;
  source: string;
  contentHash: string;
  discoveredBy?: string;
  queryThatFound?: string;
}

interface IndexResult {
  success: boolean;
  chunksIndexed: number;
  error?: string;
}

export class AutoIndexService {
  private supabase: SupabaseClient;
  private qdrant: QdrantService;
  private genai: GoogleGenAI;
  private indexQueue: PageToIndex[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.qdrant = new QdrantService();
    this.genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  /**
   * Calculate SHA-256 hash of content
   */
  calculateContentHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }

  /**
   * Check if URL should be indexed (with deduplication logic)
   * Returns: 'new' | 'update' | 'skip'
   */
  async shouldIndex(
    url: string,
    contentHash: string
  ): Promise<"new" | "update" | "skip"> {
    try {
      const { data, error } = await this.supabase
        .from("dynamic_doc_pages")
        .select("content_hash, is_indexed")
        .eq("url", url)
        .single();

      if (error || !data) {
        return "new"; // URL not found, needs indexing
      }

      if (data.content_hash === contentHash) {
        // Update access count but skip indexing
        await this.supabase
          .from("dynamic_doc_pages")
          .update({
            access_count: this.supabase.rpc("increment_access_count"),
            last_accessed_at: new Date().toISOString(),
          })
          .eq("url", url);

        return "skip"; // Same content, no need to reindex
      }

      return "update"; // Content changed, needs reindexing
    } catch (error) {
      console.error("[AutoIndex] shouldIndex error:", error);
      return "new"; // Assume new on error
    }
  }

  /**
   * Queue pages for background indexing
   */
  async queueForIndexing(pages: PageToIndex[]): Promise<void> {
    this.indexQueue.push(...pages);
    console.log(`[AutoIndex] Queued ${pages.length} pages for indexing`);

    // Start background processing if not already running
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process indexing queue in background
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.indexQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`[AutoIndex] Starting queue processing...`);

    while (this.indexQueue.length > 0) {
      const page = this.indexQueue.shift()!;

      try {
        await this.indexPage(page);
        console.log(`[AutoIndex] Successfully indexed: ${page.url}`);
      } catch (error) {
        console.error(`[AutoIndex] Failed to index ${page.url}:`, error);
      }

      // Small delay between pages to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    this.isProcessing = false;
    console.log(`[AutoIndex] Queue processing complete`);
  }

  /**
   * Index a single page into Qdrant + Supabase
   */
  async indexPage(page: PageToIndex): Promise<IndexResult> {
    const startTime = Date.now();

    try {
      // 1. Split content into chunks
      const chunks = this.splitIntoChunks(page.content);
      console.log(`[AutoIndex] Split ${page.url} into ${chunks.length} chunks`);

      // 2. Generate embeddings for each chunk
      const points: QdrantPoint[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await this.generateEmbedding(chunk);

        // Generate deterministic UUID for the point
        const pointId = this.generatePointId(page.url, i);

        points.push({
          id: pointId,
          vector: embedding,
          payload: {
            content: chunk,
            url: page.url,
            title: page.title,
            source: page.source,
            chunk_index: i,
            is_dynamic: true, // Mark as dynamically discovered
            indexed_at: new Date().toISOString(),
          },
        });
      }

      // 3. Upsert to Qdrant
      await this.qdrant.upsertPoints(points);

      // 4. Update Supabase metadata
      await this.upsertDynamicPage(page, chunks.length);

      const duration = Date.now() - startTime;
      console.log(
        `[AutoIndex] Indexed ${chunks.length} chunks in ${duration}ms`
      );

      return { success: true, chunksIndexed: chunks.length };
    } catch (error) {
      console.error(`[AutoIndex] indexPage error:`, error);
      return {
        success: false,
        chunksIndexed: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate embedding using Gemini
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.genai.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    return result.embeddings?.[0]?.values || [];
  }

  /**
   * Generate deterministic UUID v5 for Qdrant point
   */
  private generatePointId(url: string, chunkIndex: number): string {
    const namespace = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // UUID namespace
    const name = `${url}:${chunkIndex}`;

    // Simple UUID v5 generation
    const hash = crypto
      .createHash("sha1")
      .update(namespace.replace(/-/g, "") + name)
      .digest("hex");

    return [
      hash.substring(0, 8),
      hash.substring(8, 12),
      "5" + hash.substring(13, 16), // Version 5
      ((parseInt(hash.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) +
        hash.substring(18, 20), // Variant
      hash.substring(20, 32),
    ].join("-");
  }

  /**
   * Split content into overlapping chunks
   */
  private splitIntoChunks(
    content: string,
    maxLength: number = 1200,
    overlap: number = 0.2
  ): string[] {
    const chunks: string[] = [];
    const overlapSize = Math.floor(maxLength * overlap);
    const stepSize = maxLength - overlapSize;

    // Split by paragraphs first
    const paragraphs = content.split(/\n\n+/);
    let currentChunk = "";

    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length <= maxLength) {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }

        // Handle long paragraphs
        if (paragraph.length > maxLength) {
          let start = 0;
          while (start < paragraph.length) {
            chunks.push(paragraph.substring(start, start + maxLength).trim());
            start += stepSize;
          }
          currentChunk = "";
        } else {
          currentChunk = paragraph;
        }
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter((c) => c.length > 50); // Filter out tiny chunks
  }

  /**
   * Upsert dynamic page metadata to Supabase
   */
  private async upsertDynamicPage(
    page: PageToIndex,
    chunksCount: number
  ): Promise<void> {
    const now = new Date().toISOString();
    const expiresAt = new Date(
      Date.now() + 60 * 24 * 60 * 60 * 1000
    ).toISOString(); // 60 days

    const { error } = await this.supabase.from("dynamic_doc_pages").upsert(
      {
        url: page.url,
        source_id: page.source,
        title: page.title,
        content_hash: page.contentHash,
        is_indexed: true,
        indexed_at: now,
        discovered_by: page.discoveredBy || null,
        query_that_found: page.queryThatFound || null,
        access_count: 1,
        last_accessed_at: now,
        expires_at: expiresAt,
        chunks_count: chunksCount,
      },
      {
        onConflict: "url",
      }
    );

    if (error) {
      console.error("[AutoIndex] Supabase upsert error:", error);
    }
  }

  /**
   * Check if URL is already indexed
   */
  async isIndexed(url: string): Promise<boolean> {
    const { data } = await this.supabase
      .from("dynamic_doc_pages")
      .select("is_indexed")
      .eq("url", url)
      .single();

    return !!data?.is_indexed;
  }

  /**
   * Get queue status
   */
  getQueueStatus(): { pending: number; isProcessing: boolean } {
    return {
      pending: this.indexQueue.length,
      isProcessing: this.isProcessing,
    };
  }
}

// Export singleton
export const autoIndexService = new AutoIndexService();

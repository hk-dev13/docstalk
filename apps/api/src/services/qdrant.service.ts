import { QdrantClient } from "@qdrant/qdrant-js";

export interface QdrantPoint {
  id: string;
  vector: number[];
  payload: {
    source: string;
    url: string;
    title: string;
    content: string;
    chunk_index: number;
    [key: string]: any;
  };
}

export class QdrantService {
  private client: QdrantClient;
  private readonly COLLECTION_NAME = "doc_chunks";
  private readonly VECTOR_SIZE = 768; // Gemini embedding size

  constructor() {
    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url) {
      console.warn("⚠️ QDRANT_URL is not set. QdrantService will fail.");
    }

    this.client = new QdrantClient({
      url,
      apiKey,
    });
  }

  /**
   * Initialize collection if it doesn't exist
   */
  async ensureCollection() {
    try {
      const result = await this.client.getCollections();
      const exists = result.collections.some(
        (c) => c.name === this.COLLECTION_NAME
      );

      if (!exists) {
        console.log(`Creating Qdrant collection: ${this.COLLECTION_NAME}`);
        await this.client.createCollection(this.COLLECTION_NAME, {
          vectors: {
            size: this.VECTOR_SIZE,
            distance: "Cosine",
          },
        });
      }
    } catch (error) {
      console.error("Failed to ensure Qdrant collection:", error);
      throw error;
    }
  }

  /**
   * Upsert points (chunks)
   */
  async upsertPoints(points: QdrantPoint[]) {
    try {
      await this.client.upsert(this.COLLECTION_NAME, {
        wait: true,
        points: points.map((p) => ({
          id: p.id,
          vector: p.vector,
          payload: p.payload,
        })),
      });
    } catch (error) {
      console.error("Failed to upsert points to Qdrant:", error);
      throw error;
    }
  }

  /**
   * Search for similar chunks
   */
  async search(vector: number[], limit: number = 5, filterSource?: string) {
    try {
      const filter = filterSource
        ? {
            must: [
              {
                key: "source",
                match: {
                  value: filterSource,
                },
              },
            ],
          }
        : undefined;

      const results = await this.client.search(this.COLLECTION_NAME, {
        vector,
        limit,
        filter,
        with_payload: true,
      });

      return results;
    } catch (error) {
      console.error("Qdrant search failed:", error);
      throw error;
    }
  }

  /**
   * Delete points by source (for cleanup)
   */
  async deleteBySource(source: string) {
    try {
      await this.client.delete(this.COLLECTION_NAME, {
        wait: true,
        filter: {
          must: [
            {
              key: "source",
              match: {
                value: source,
              },
            },
          ],
        },
      });
    } catch (error) {
      console.error(
        `Failed to delete Qdrant points for source ${source}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.getCollections();
      return !!result;
    } catch (error) {
      return false;
    }
  }
}

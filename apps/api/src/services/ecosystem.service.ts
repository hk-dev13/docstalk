import { SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import {
  DocEcosystem,
  EcosystemDetectionResult,
  EcosystemId,
} from "@docstalk/types";

export class EcosystemService {
  private supabase: SupabaseClient;
  private client: GoogleGenAI;
  private ecosystemCache: DocEcosystem[] = [];
  private ecosystemSourcesMap: Map<string, string[]> = new Map();
  private lastCacheTime: number = 0;
  private readonly CACHE_TTL = 300000; // 5 minutes

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  }

  /**
   * Get all ecosystems (cached)
   */
  async getEcosystems(): Promise<DocEcosystem[]> {
    const now = Date.now();
    if (
      this.ecosystemCache.length > 0 &&
      now - this.lastCacheTime < this.CACHE_TTL
    ) {
      return this.ecosystemCache;
    }

    // Fetch ecosystems
    const { data: ecosystems, error: ecoError } = await this.supabase
      .from("doc_ecosystems")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (ecoError) {
      console.error("Error fetching ecosystems:", ecoError);
      return [];
    }

    // Fetch doc sources to map them
    const { data: sources, error: srcError } = await this.supabase
      .from("doc_sources")
      .select("id, ecosystem_id")
      .not("ecosystem_id", "is", null);

    if (!srcError && sources) {
      this.ecosystemSourcesMap.clear();
      sources.forEach((src) => {
        const current = this.ecosystemSourcesMap.get(src.ecosystem_id) || [];
        current.push(src.id);
        this.ecosystemSourcesMap.set(src.ecosystem_id, current);
      });
    }

    this.ecosystemCache = ecosystems as DocEcosystem[];
    this.lastCacheTime = now;
    return this.ecosystemCache;
  }

  /**
   * Get doc sources for an ecosystem
   */
  getSourcesForEcosystem(ecosystemId: string): string[] {
    return this.ecosystemSourcesMap.get(ecosystemId) || [];
  }

  /**
   * Detect ecosystem from query using 4-stage process
   */
  async detectEcosystem(query: string): Promise<EcosystemDetectionResult> {
    const ecosystems = await this.getEcosystems();
    const normalizedQuery = query.toLowerCase().trim();

    // Stage 1: Alias Matching (Fastest)
    const aliasMatch = this.detectByAlias(normalizedQuery, ecosystems);
    if (aliasMatch) return aliasMatch;

    // Stage 2: Keyword Group Matching (Fast)
    const keywordMatch = this.detectByKeywords(normalizedQuery, ecosystems);
    if (keywordMatch) return keywordMatch;

    // Stage 3: Hybrid Search (Medium)
    const hybridMatch = await this.detectByHybridSearch(query, ecosystems);
    if (hybridMatch) return hybridMatch;

    // Stage 4: AI Analysis (Slowest but smartest)
    return this.detectByAI(query, ecosystems);
  }

  private detectByAlias(
    query: string,
    ecosystems: DocEcosystem[]
  ): EcosystemDetectionResult | null {
    for (const ecosystem of ecosystems) {
      if (
        ecosystem.aliases?.some((alias: string) =>
          query.includes(alias.toLowerCase())
        )
      ) {
        return {
          ecosystem,
          confidence: 95,
          reasoning: `Matched alias in query`,
          suggestedDocSources: this.getSourcesForEcosystem(ecosystem.id),
        };
      }
    }
    return null;
  }

  private detectByKeywords(
    query: string,
    ecosystems: DocEcosystem[]
  ): EcosystemDetectionResult | null {
    let bestMatch: DocEcosystem | null = null;
    let maxScore = 0;
    let matchedKeywords: string[] = [];

    for (const ecosystem of ecosystems) {
      let score = 0;
      const matched: string[] = [];

      // Check primary keywords
      ecosystem.keywords.forEach((kw: string) => {
        if (query.includes(kw.toLowerCase())) {
          score += 10;
          matched.push(kw);
        }
      });

      // Check keyword groups - SAME WEIGHT as primary keywords
      // This ensures redis/mongodb/aws etc. get properly detected
      if (ecosystem.keyword_groups) {
        Object.entries(ecosystem.keyword_groups).forEach(
          ([group, keywords]) => {
            (keywords as string[]).forEach((kw: string) => {
              if (query.includes(kw.toLowerCase())) {
                score += 10; // Same weight as primary keywords
                matched.push(`${group}:${kw}`);
              }
            });
          }
        );
      }

      if (score > maxScore) {
        maxScore = score;
        bestMatch = ecosystem;
        matchedKeywords = matched;
      }
    }

    if (bestMatch && maxScore >= 10) {
      return {
        ecosystem: bestMatch,
        confidence: Math.min(95, 70 + matchedKeywords.length * 5),
        reasoning: `Matched keywords: [${matchedKeywords.join(", ")}]`,
        suggestedDocSources: this.getSourcesForEcosystem(
          (bestMatch as DocEcosystem).id
        ),
      };
    }

    return null;
  }

  private async detectByHybridSearch(
    query: string,
    ecosystems: DocEcosystem[]
  ): Promise<EcosystemDetectionResult | null> {
    // Simple cosine similarity if embeddings are available in memory
    // Since we only have ~8 ecosystems, we can do brute force cosine similarity in JS

    try {
      // Generate embedding for query
      const result = await this.client.models.embedContent({
        model: "text-embedding-004",
        contents: query,
      });

      const queryEmbedding = result.embeddings?.[0]?.values;
      if (!queryEmbedding) return null;

      let bestMatch: DocEcosystem | null = null;
      let maxSimilarity = -1;

      for (const ecosystem of ecosystems) {
        if (ecosystem.description_embedding) {
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            ecosystem.description_embedding
          );
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            bestMatch = ecosystem;
          }
        }
      }

      if (bestMatch && maxSimilarity > 0.75) {
        // Threshold
        return {
          ecosystem: bestMatch,
          confidence: Math.round(maxSimilarity * 100),
          reasoning: `Semantic similarity match (${(
            maxSimilarity * 100
          ).toFixed(1)}%)`,
          suggestedDocSources: this.getSourcesForEcosystem(
            (bestMatch as DocEcosystem).id
          ),
        };
      }
    } catch (error) {
      console.error("Hybrid search failed:", error);
    }

    return null;
  }

  private async detectByAI(
    query: string,
    ecosystems: DocEcosystem[]
  ): Promise<EcosystemDetectionResult> {
    const prompt = `
    Analyze this query and select the best matching ecosystem.
    
    Query: "${query}"
    
    Available Ecosystems:
    ${ecosystems.map((e) => `- ${e.id}: ${e.description}`).join("\n")}
    
    Respond with JSON: { "ecosystemId": "string", "confidence": number, "reasoning": "string" }
    `;

    try {
      const result = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      const response = JSON.parse(result.text || "{}");
      const ecosystem = ecosystems.find((e) => e.id === response.ecosystemId);

      if (ecosystem) {
        return {
          ecosystem,
          confidence: response.confidence || 50,
          reasoning: response.reasoning || "AI detection",
          suggestedDocSources: this.getSourcesForEcosystem(ecosystem.id),
        };
      }
    } catch (error) {
      console.error("AI detection failed:", error);
    }

    // Fallback to General
    const general =
      ecosystems.find((e) => e.id === EcosystemId.GENERAL) || ecosystems[0];
    return {
      ecosystem: general,
      confidence: 0,
      reasoning: "Fallback to general",
      suggestedDocSources: this.getSourcesForEcosystem(general.id),
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

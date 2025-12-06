import { GoogleGenAI } from "@google/genai";
import { SupabaseClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import type {
  DocSourceMetadata,
  RoutingDecision,
  ClarificationResponse,
  SessionContext,
  ContextSwitch,
  RouterConfig,
  EcosystemDetectionResult,
} from "@docstalk/types";
import { EcosystemService } from "./ecosystem.service.js";

/**
 * RouterService - AI Router for automatic doc source detection
 * NOW 100% DYNAMIC & DATABASE DRIVEN
 */
export class RouterService {
  private client: GoogleGenAI;
  private supabase: SupabaseClient;
  private config: RouterConfig;
  private ecosystemService: EcosystemService;

  // Cache sederhana untuk menghindari spam request ke DB saat mengambil instructions
  private sourceCache: Map<string, DocSourceMetadata> = new Map();
  private lastCacheTime: number = 0;

  constructor(supabase: SupabaseClient, config?: Partial<RouterConfig>) {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    this.supabase = supabase;
    this.config = {
      confidenceThreshold: config?.confidenceThreshold ?? 70,
      enableMultiSource: config?.enableMultiSource ?? true,
      cacheContextDecisions: config?.cacheContextDecisions ?? true,
    };
    this.ecosystemService = new EcosystemService(supabase);
  }

  /**
   * Get available doc sources from database (with Caching)
   */
  async getAvailableDocSources(): Promise<DocSourceMetadata[]> {
    // Refresh cache every 5 minutes
    const now = Date.now();
    if (this.sourceCache.size > 0 && now - this.lastCacheTime < 300000) {
      return Array.from(this.sourceCache.values());
    }

    const { data, error } = await this.supabase.rpc(
      "get_available_doc_sources"
    );

    if (error) {
      console.error("Error fetching doc sources:", error);
      return [];
    }

    const sources = (data || []).map((ds: any) => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      keywords: ds.keywords || [],
      isActive: true,
      iconUrl: ds.icon_url,
      officialUrl: ds.official_url,
    }));

    // Update Cache
    this.sourceCache.clear();
    sources.forEach((s: DocSourceMetadata) => this.sourceCache.set(s.id, s));
    this.lastCacheTime = now;

    return sources;
  }

  /**
   * Get session context for a conversation
   */
  async getSessionContext(conversationId: string): Promise<SessionContext> {
    const { data, error } = await this.supabase.rpc("get_session_context", {
      p_conversation_id: conversationId,
    });

    if (error || !data || data.length === 0) {
      return {
        conversationId,
        contextHistory: [],
        currentSource: null,
        previousSource: null,
        switchCount: 0,
      };
    }

    const result = data[0];
    const history = result.context_history || [];

    return {
      conversationId,
      contextHistory: history.map((h: any) => ({
        id: h.id,
        conversationId,
        fromSource: h.fromSource,
        toSource: h.toSource,
        query: h.query,
        timestamp: new Date(h.timestamp),
        isExplicit: h.isExplicit,
      })),
      currentSource: result.current_source,
      previousSource: result.previous_source,
      switchCount: result.switch_count || 0,
    };
  }

  /**
   * Track context switch in database
   */
  async trackContextSwitch(
    conversationId: string,
    fromSource: string | null,
    toSource: string,
    query: string,
    isExplicit: boolean = false
  ): Promise<void> {
    const { error } = await this.supabase.rpc("track_context_switch", {
      p_conversation_id: conversationId,
      p_from_source: fromSource,
      p_to_source: toSource,
      p_query: query,
      p_is_explicit: isExplicit,
    });

    if (error) {
      console.error("Error tracking context switch:", error);
    }
  }

  /**
   * Detect context from query using AI
   */
  async detectContext(
    query: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    conversationId?: string
  ): Promise<RoutingDecision> {
    try {
      // 0. Quick Meta Detection (Regex) - Prioritize Self-Identity
      const metaRegex =
        /^(who are you|what is (this|docstalk)|(ini|apa) (itu|kah) (docstalk|ini|aplikasi|platform)|siapa (kamu|anda)|(docstalk )?identity|tech stack|tentang docstalk|platform apa ini)/i;

      if (
        metaRegex.test(query) ||
        (query.toLowerCase().includes("docstalk") && query.length < 50)
      ) {
        return {
          queryType: "meta",
          confidence: 100,
          reasoning:
            "Direct meta query about DocsTalk identity detected via regex",
          needsClarification: false,
          suggestedSources: [],
        };
      }

      // 1. Ecosystem Detection (Priority)
      const ecosystemResult = await this.ecosystemService.detectEcosystem(
        query
      );

      if (
        ecosystemResult.confidence > 80 &&
        ecosystemResult.suggestedDocSources.length > 0
      ) {
        // Use actual doc sources from ecosystem mapping, NOT ecosystem ID
        const docSources = ecosystemResult.suggestedDocSources;
        const primaryDocSource = docSources[0]; // First doc source as primary
        const additionalDocSources = docSources.slice(1); // Rest as additional

        return {
          queryType: "specific",
          primarySource: primaryDocSource, // Use actual doc source (e.g., "nextjs", "react")
          additionalSources:
            additionalDocSources.length > 0 ? additionalDocSources : undefined,
          confidence: ecosystemResult.confidence,
          reasoning: `Ecosystem detected: ${
            ecosystemResult.ecosystem.name
          } → Sources: [${docSources.join(", ")}] (${
            ecosystemResult.reasoning
          })`,
          needsClarification: false,
          suggestedSources: docSources,
        };
      }

      const availableDocSources = await this.getAvailableDocSources();

      let sessionContext: SessionContext | null = null;
      if (conversationId) {
        sessionContext = await this.getSessionContext(conversationId);
      }

      const prompt = this.buildDetectionPrompt(
        query,
        availableDocSources,
        conversationHistory,
        sessionContext
      );

      const result = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      });

      const responseText = result.text;
      const detection = JSON.parse(responseText || "{}");

      return this.parseDetectionResponse(detection);
    } catch (error) {
      console.error("Error in context detection:", error);
      const allSources = await this.getAvailableDocSources();
      return {
        queryType: "ambiguous",
        confidence: 0,
        reasoning: "Detection failed, fallback to clarification",
        needsClarification: true,
        suggestedSources: allSources.map((s) => s.id),
      };
    }
  }

  private buildDetectionPrompt(
    query: string,
    docSources: DocSourceMetadata[],
    conversationHistory?: Array<{ role: string; content: string }>,
    sessionContext?: SessionContext | null
  ): string {
    const historyText = conversationHistory
      ? `\n\nConversation History (last 3 messages):\n${conversationHistory
          .slice(-3)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")}`
      : "";

    const sessionText =
      sessionContext && sessionContext.switchCount > 0
        ? `\n\nSession Context:\nUser has switched contexts ${sessionContext.switchCount} times. Current: ${sessionContext.currentSource}. Previous: ${sessionContext.previousSource}. Analyze query independently.`
        : "\n\nThis is the first query in the conversation.";

    // Dynamically list all sources from DB
    const sourcesList = docSources
      .map(
        (ds) =>
          `     - ID: "${ds.id}" (${ds.name})\n       Desc: ${
            ds.description
          }\n       Keywords: ${ds.keywords.slice(0, 6).join(", ")}`
      )
      .join("\n");

    return `You are a routing AI for DocsTalk.
Analyze the user query and determine the query type.

**Current Query:** "${query}"
${historyText}
${sessionText}

**Query Types:**
1. **meta**: Questions about DocsTalk platform itself (capabilities, tech stack, "what is this app?").
2. **specific**: Questions about specific documentation sources below.
3. **ambiguous**: Query implies docs but unclear which one (or matches multiple).
4. **general**: Questions unrelated to docs or coding (e.g. "Create a poem", "General knowledge").

**Available Documentation Sources:**
${sourcesList}

**Detection Logic:**
- If query matches keywords of ONE source -> queryType: "specific", set primarySource.
- If query matches MULTIPLE sources -> queryType: "specific", set additionalSources.
- If completely unrelated -> queryType: "general".
- If asking about the App/DocsTalk -> queryType: "meta".

**Respond with JSON:**
{
  "queryType": "meta|specific|ambiguous|general",
  "primarySource": "id_string",
  "additionalSources": ["id_string"],
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "suggestedSources": ["id_string"]
}`;
  }

  private parseDetectionResponse(detection: any): RoutingDecision {
    const queryType = detection.queryType || "ambiguous";
    const confidence = Math.min(100, Math.max(0, detection.confidence || 0));

    if (
      queryType === "ambiguous" &&
      detection.suggestedSources &&
      detection.suggestedSources.length > 0 &&
      detection.suggestedSources.length <= 3
    ) {
      return {
        queryType: "specific",
        primarySource: detection.suggestedSources[0],
        additionalSources: detection.suggestedSources.slice(1),
        confidence: 85,
        reasoning:
          detection.reasoning + " (Auto-resolved ambiguity with multi-source)",
        needsClarification: false,
        suggestedSources: detection.suggestedSources,
      };
    }

    return {
      queryType,
      primarySource: detection.primarySource || undefined,
      additionalSources: detection.additionalSources || undefined,
      confidence,
      reasoning: detection.reasoning || "",
      needsClarification:
        queryType === "ambiguous" ||
        confidence < this.config.confidenceThreshold,
      suggestedSources: detection.suggestedSources || undefined,
    };
  }

  generateClarificationPrompt(
    suggestedSources: string[],
    docSources?: DocSourceMetadata[]
  ): ClarificationResponse {
    const sourceMetadata = docSources || [];
    const options = suggestedSources
      .map((id) => {
        const source = sourceMetadata.find((s) => s.id === id);
        if (!source) return null;
        return {
          id: source.id,
          label: source.name,
          description: source.description,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      label: string;
      description: string;
    }>;

    return {
      message:
        "I detected multiple possible documentation sources. Which one would you like to explore?",
      options,
    };
  }

  /**
   * Handle meta queries (Dynamic Language & Content)
   * Answers "What is DocsTalk?" based on user language.
   */
  async handleMetaQuery(query: string): Promise<string> {
    const docSources = await this.getAvailableDocSources();
    const versions = this.getTechStackVersions();

    // Context for the AI to answer "Who are you?"
    const techStackInfo = `
    - Frontend: Next.js ${versions.next}, React ${versions.react}, Tailwind CSS ${versions.tailwind}
    - Backend: Fastify, Supabase (Vector Store)
    - AI: Google Gemini API ${versions.gemini} (RAG Architecture)
    `;

    const availableDocsInfo = docSources
      .map((s) => `- ${s.name}: ${s.description}`)
      .join("\n");

    const prompt = `
    You are DocsTalk, an intelligent AI documentation assistant.
    
    **User Query:** "${query}"
    
    **Your Identity:**
    - You are a RAG-based AI assistant designed to help developers find answers in official documentation.
    - You are NOT just a generic LLM; you have access to specific indexed documentation.
    - You currently support ${docSources.length} sources:
    ${availableDocsInfo}
    
    **Your Tech Stack:**
    ${techStackInfo}
    
    **Instructions:**
    1. **Detect the language** of the User Query (Indonesian, English, Arabic, Chinese, etc.).
    2. Answer the query naturally in that **SAME LANGUAGE**.
    3. Be helpful, professional, and concise.
    4. If asked about what you can do, mention that you can search specific documentation automatically.
    
    Answer now:
    `;

    try {
      const result = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { temperature: 0.3 },
      });
      return result.text || "I am DocsTalk, your documentation assistant.";
    } catch (error) {
      // Fallback if AI fails
      return `DocsTalk is your Smart Documentation Assistant. I support ${docSources.length} sources.`;
    }
  }

  /**
   * Get specialized instructions for a doc source
   * NOW DYNAMIC: Generates prompt based on DB Keywords & Description!
   */
  async getDocSourceInstructions(docSourceId: string): Promise<string> {
    // 1. Try to find source in cache/DB
    const sources = await this.getAvailableDocSources();
    const source = sources.find(
      (s) => s.id.toLowerCase() === docSourceId.toLowerCase()
    );

    // 2. If source found in DB, build Dynamic Instruction
    if (source) {
      const keywordsList =
        source.keywords.length > 0
          ? source.keywords.join(", ")
          : "standard patterns and best practices";

      return `You are an expert specialist in **${source.name}**.
      
**Context:**
The user is asking questions specifically about ${source.name}.
Description: ${source.description}

**Your Goal:**
Provide accurate, idiomatic, and performance-oriented solutions using ${source.name}.

**Key Focus Areas (based on database metadata):**
- Focus heavily on these topics: ${keywordsList}.
- Use official APIs and conventions.
- Avoid deprecated features.
- Provide code examples that are ready to copy-paste.`;
    }

    // 3. Fallback (If ID not found in DB for some reason)
    return `You are an expert specialist in **${docSourceId}**.
Focus on official documentation, best practices, and idiomatic code styles specific to the ${docSourceId} ecosystem.`;
  }

  /**
   * Get tech stack versions
   */
  private getTechStackVersions(): {
    next: string;
    react: string;
    tailwind: string;
    gemini: string;
  } {
    try {
      const cwd = process.cwd();
      let webPkgPath = path.join(cwd, "apps/web/package.json");
      let apiPkgPath = path.join(cwd, "apps/api/package.json");

      if (cwd.endsWith("apps/api")) {
        webPkgPath = path.join(cwd, "../web/package.json");
        apiPkgPath = path.join(cwd, "package.json");
      }

      const versions = {
        next: "Latest",
        react: "Latest",
        tailwind: "Latest",
        gemini: "Latest",
      };

      if (fs.existsSync(webPkgPath)) {
        const webPkg = JSON.parse(fs.readFileSync(webPkgPath, "utf-8"));
        const deps = { ...webPkg.dependencies, ...webPkg.devDependencies };
        if (deps.next)
          versions.next = deps.next.replace("^", "").replace("~", "");
        if (deps.react)
          versions.react = deps.react.replace("^", "").replace("~", "");
        if (deps.tailwindcss)
          versions.tailwind = deps.tailwindcss
            .replace("^", "")
            .replace("~", "");
      }

      if (fs.existsSync(apiPkgPath)) {
        const apiPkg = JSON.parse(fs.readFileSync(apiPkgPath, "utf-8"));
        const deps = { ...apiPkg.dependencies, ...apiPkg.devDependencies };
        if (deps["@google/genai"])
          versions.gemini = deps["@google/genai"]
            .replace("^", "")
            .replace("~", "");
      }

      return versions;
    } catch (error) {
      return {
        next: "Latest",
        react: "Latest",
        tailwind: "Latest",
        gemini: "Latest",
      };
    }
  }
}

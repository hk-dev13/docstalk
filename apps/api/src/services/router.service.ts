import { GoogleGenAI } from "@google/genai";
import { SupabaseClient } from "@supabase/supabase-js";
import type {
  DocSourceMetadata,
  RoutingDecision,
  ClarificationResponse,
  SessionContext,
  ContextSwitch,
  RouterConfig,
} from "@docstalk/types";

/**
 * RouterService - AI Router for automatic doc source detection
 *
 * Responsibilities:
 * 1. Detect query type (meta, specific, ambiguous)
 * 2. Route to appropriate doc source or handle meta queries
 * 3. Track session memory (context switches)
 * 4. Generate clarification prompts when needed
 */
export class RouterService {
  private client: GoogleGenAI;
  private supabase: SupabaseClient;
  private config: RouterConfig;

  constructor(supabase: SupabaseClient, config?: Partial<RouterConfig>) {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    this.supabase = supabase;
    this.config = {
      confidenceThreshold: config?.confidenceThreshold ?? 70,
      enableMultiSource: config?.enableMultiSource ?? true,
      cacheContextDecisions: config?.cacheContextDecisions ?? true,
    };
  }

  /**
   * Get available doc sources from database
   */
  async getAvailableDocSources(): Promise<DocSourceMetadata[]> {
    const { data, error } = await this.supabase.rpc(
      "get_available_doc_sources"
    );

    if (error) {
      console.error("Error fetching doc sources:", error);
      return [];
    }

    return (data || []).map((ds: any) => ({
      id: ds.id,
      name: ds.name,
      description: ds.description,
      keywords: ds.keywords,
      isActive: true,
      iconUrl: ds.icon_url,
      officialUrl: ds.official_url,
    }));
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
      // Get available doc sources
      const availableDocSources = await this.getAvailableDocSources();

      // Get session context if conversationId provided
      let sessionContext: SessionContext | null = null;
      if (conversationId) {
        sessionContext = await this.getSessionContext(conversationId);
      }

      // Build detection prompt
      const prompt = this.buildDetectionPrompt(
        query,
        availableDocSources,
        conversationHistory,
        sessionContext
      );

      // Call Gemini for structured detection
      const result = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          temperature: 0.1, // Low temperature for consistent routing
          responseMimeType: "application/json",
        },
      });

      const responseText = result.text;
      const detection = JSON.parse(responseText || "{}");

      return this.parseDetectionResponse(detection);
    } catch (error) {
      console.error("Error in context detection:", error);
      // Fallback to ambiguous with all sources
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

  /**
   * Build detection prompt with session context awareness
   */
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
        ? `\n\nSession Context:\nUser has switched contexts ${
            sessionContext.switchCount
          } time(s) in this conversation:\n${sessionContext.contextHistory
            .map(
              (cs: ContextSwitch, i: number) =>
                `${i + 1}. ${cs.fromSource || "start"} → ${
                  cs.toSource
                }: "${cs.query.substring(0, 50)}..."`
            )
            .join("\n")}\n\nCurrent context: ${
            sessionContext.currentSource
          }\nPrevious context: ${
            sessionContext.previousSource
          }\n\n**IMPORTANT:** Don't assume the query is about "${
            sessionContext.currentSource
          }" just because it was the previous context. Analyze the query independently.`
        : "\n\nThis is the first query in the conversation.";

    return `You are a routing AI for DocsTalk, a documentation Q&A platform.

Analyze the following user query and determine the query type:

**Current Query:** "${query}"
${historyText}
${sessionText}

**Query Types:**
1. **meta**: Questions about DocsTalk platform itself
   - Examples: "What is DocsTalk?", "How many docs do you have?", "What can you help me with?", "What documentation sources are available?", "ini aplikasi apa?", "apa itu docstalk?", "bisa bantu apa?"
   
2. **specific**: Questions about specific documentation sources
   - Available sources:
${docSources
  .map(
    (ds) =>
      `     - ${ds.id}: ${ds.name} - ${
        ds.description
      }\n       Keywords: ${ds.keywords.slice(0, 5).join(", ")}`
  )
  .join("\n")}

3. **ambiguous**: Query could refer to multiple sources or unclear

4. **general**: Questions NOT related to the available documentation sources
   - Examples: "How do I make a sandwich?", "Who is the president?", "Write a poem", "General programming questions without specific context"

**Detection Guidelines:**
- If query is about DocsTalk platform → queryType: "meta"
- If query clearly mentions keywords from ONE doc source → queryType: "specific", set primarySource, confidence: 85-100
- If query mentions keywords from MULTIPLE sources → queryType: "specific", set additionalSources
- If keywords match but unclear which source → queryType: "ambiguous", suggest possible sources
- If query is completely unrelated to docs or platform → queryType: "general"
- For general programming questions without specific framework mentions → queryType: "ambiguous" (prefer ambiguous if it *could* be related)

**Respond with JSON:**
{
  "queryType": "meta|specific|ambiguous|general",
  "primarySource": "nextjs",
  "additionalSources": ["react"],
  "confidence": 85,
  "reasoning": "Explain your decision briefly",
  "suggestedSources": ["nextjs", "react"]
}`;
  }

  /**
   * Parse and validate detection response
   */
  private parseDetectionResponse(detection: any): RoutingDecision {
    const queryType = detection.queryType || "ambiguous";
    const confidence = Math.min(100, Math.max(0, detection.confidence || 0));

    // Smart Multi-Source Handling:
    // If ambiguous but we have suggestions (<= 3), treat as specific multi-source query
    // This avoids the clarification popup and gives a better UX
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
        confidence: 85, // Boost confidence for multi-source
        reasoning:
          detection.reasoning +
          " (Automatically resolving ambiguity with multi-source answer)",
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

  /**
   * Generate clarification prompt for user
   */
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
        "I detected multiple possible documentation sources for your question. Which one would you like to ask about?",
      options,
    };
  }

  /**
   * Handle meta queries about the platform
   */
  async handleMetaQuery(query: string): Promise<string> {
    const docSources = await this.getAvailableDocSources();

    const lowerQuery = query.toLowerCase();

    // What is DocsTalk?
    if (
      lowerQuery.includes("what is docstalk") ||
      lowerQuery.includes("what's docstalk") ||
      lowerQuery.includes("tell me about docstalk") ||
      lowerQuery.includes("ini aplikasi apa") ||
      lowerQuery.includes("apa itu docstalk") ||
      lowerQuery.includes("aplikasi ini")
    ) {
      if (
        lowerQuery.includes("ini aplikasi apa") ||
        lowerQuery.includes("apa itu docstalk") ||
        lowerQuery.includes("aplikasi ini")
      ) {
        return `DocsTalk adalah asisten dokumentasi AI yang membantu developer menemukan jawaban dari dokumentasi resmi dengan cepat. Saat ini kami mendukung **${
          docSources.length
        } sumber dokumentasi**: ${docSources
          .map((s) => s.name)
          .join(
            ", "
          )}. Tanyakan saja pertanyaan Anda, dan saya akan mendeteksi dokumentasi mana yang Anda butuhkan secara otomatis!`;
      }
      return `DocsTalk is an AI-powered documentation Q&A platform that helps developers quickly find answers from official documentation. We currently support **${
        docSources.length
      } documentation sources**: ${docSources
        .map((s) => s.name)
        .join(
          ", "
        )}. Just ask your question, and I'll automatically detect which documentation you need and provide accurate answers!`;
    }

    // How many docs / What docs available?
    if (
      lowerQuery.includes("how many") ||
      lowerQuery.includes("what docs") ||
      lowerQuery.includes("available") ||
      lowerQuery.includes("support")
    ) {
      return `I currently support **${
        docSources.length
      } documentation sources**:\n\n${docSources
        .map((s) => `• **${s.name}** - ${s.description}`)
        .join(
          "\n"
        )}\n\nYou can ask questions about any of these, and I'll automatically detect which documentation you need!`;
    }

    // What can you do / help with?
    if (
      lowerQuery.includes("what can you") ||
      lowerQuery.includes("how can you help") ||
      lowerQuery.includes("capabilities")
    ) {
      return `I can help you with:\n\n✅ **Smart Documentation Search** - Ask questions in natural language\n✅ **Auto-Detection** - I automatically detect which documentation you're asking about\n✅ **Context-Aware Answers** - I remember your conversation context\n✅ **Multi-Framework Support** - Switch between ${docSources
        .map((s) => s.name)
        .join(
          ", "
        )} seamlessly\n\nJust ask your question, and I'll take care of the rest!`;
    }

    // Default meta response
    return `DocsTalk is your AI documentation assistant. I support ${
      docSources.length
    } documentation sources (${docSources
      .map((s) => s.name)
      .join(
        ", "
      )}) and can automatically detect which one you're asking about. How can I help you today?`;
  }

  /**
   * Get specialized instructions for a doc source
   */
  getDocSourceInstructions(docSource: string): string {
    const instructions: Record<string, string> = {
      nextjs: `You are an expert in Next.js framework. Focus on:
- App Router and Pages Router patterns
- Server Components vs Client Components
- Data fetching (SSR, SSG, ISR)
- API Routes and Server Actions
- Routing and navigation
- Image and Font optimization`,

      react: `You are an expert in React library. Focus on:
- Hooks (useState, useEffect, useContext, etc)
- Component composition and patterns
- Props and state management
- Lifecycle and effects
- Performance optimization
- React 18+ features (Suspense, Transitions, etc)`,

      typescript: `You are an expert in TypeScript language. Focus on:
- Type system and type inference
- Interfaces and type aliases
- Generics and utility types
- tsconfig.json configuration
- Advanced types (mapped, conditional, etc)
- Best practices and patterns`,
    };

    return instructions[docSource] || `You are an expert in ${docSource}.`;
  }
}

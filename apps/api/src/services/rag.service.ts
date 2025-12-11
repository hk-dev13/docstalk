import { GoogleGenAI } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { QdrantService } from "./qdrant.service.js";
import {
  OnlineSearchService,
  onlineSearchService,
} from "./online-search.service.js";
import { AutoIndexService, autoIndexService } from "./auto-index.service.js";

interface SearchResult {
  id: string;
  content: string;
  url: string;
  title: string;
  source: string;
  similarity: number;
  chunk_index?: number;
  full_content?: string;
  parent_id?: string;
  metadata?: Record<string, any>;
}

interface RAGResponse {
  answer: string;
  code?: string;
  reasoning?: string;
  references: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  tokensUsed: number;
}

export class RAGService {
  private client: GoogleGenAI;
  public supabase: SupabaseClient;
  private qdrant: QdrantService;
  private onlineSearch: OnlineSearchService;
  private autoIndex: AutoIndexService;

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.qdrant = new QdrantService();
    this.onlineSearch = onlineSearchService;
    this.autoIndex = autoIndexService;
  }

  async initialize() {
    await this.qdrant.ensureCollection();
  }

  async checkUsageLimit(
    clerkId: string,
    email: string
  ): Promise<{ allowed: boolean; count: number; limit: number }> {
    // 1. Get or Create User (Direct upsert, no RPC)
    const { data: userData, error: userError } = await this.supabase
      .from("users")
      .upsert(
        { clerk_id: clerkId, email: email },
        { onConflict: "clerk_id", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (userError) {
      console.error("User upsert error in checkUsageLimit:", userError);
      throw new Error(`User error: ${userError.message}`);
    }

    const userId = userData.id;

    // 2. Ensure usage record exists
    await this.supabase
      .from("user_usage")
      .upsert(
        { user_id: userId, query_count: 0 },
        { onConflict: "user_id", ignoreDuplicates: true }
      );

    // 3. Get usage
    const { data: usage, error: usageError } = await this.supabase
      .from("user_usage")
      .select("query_count")
      .eq("user_id", userId)
      .single();

    if (usageError) throw new Error(`Usage error: ${usageError.message}`);

    const LIMIT = 30;
    return {
      allowed: usage.query_count < LIMIT,
      count: usage.query_count,
      limit: LIMIT,
    };
  }

  async incrementUsage(clerkId: string): Promise<void> {
    // Get internal ID
    const { data: user } = await this.supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (!user) return;

    // Increment
    await this.supabase.rpc("increment_usage", { user_uuid: user.id });
    // Note: We'll implement increment_usage RPC or just direct update
    // Direct update for simplicity:
    const { data: usage } = await this.supabase
      .from("user_usage")
      .select("query_count")
      .eq("user_id", user.id)
      .single();

    if (usage) {
      await this.supabase
        .from("user_usage")
        .update({ query_count: usage.query_count + 1 })
        .eq("user_id", user.id);
    }
  }

  /**
   * Create or get conversation
   */
  async getOrCreateConversation(
    clerkId: string,
    docSource: string,
    title?: string,
    userEmail?: string
  ): Promise<string> {
    // Get or create user (direct insert, no RPC dependency)
    let userId: string;

    if (userEmail) {
      // Use upsert to ensure user exists
      const { data: userData, error: userError } = await this.supabase
        .from("users")
        .upsert(
          { clerk_id: clerkId, email: userEmail },
          { onConflict: "clerk_id", ignoreDuplicates: false }
        )
        .select("id")
        .single();

      if (userError) {
        console.error("User upsert error:", userError);
        throw new Error(`User creation failed: ${userError.message}`);
      }

      userId = userData.id;

      // Ensure user_usage record exists
      await this.supabase
        .from("user_usage")
        .upsert(
          { user_id: userId, query_count: 0 },
          { onConflict: "user_id", ignoreDuplicates: true }
        );
    } else {
      // Fallback: try to get existing user
      const { data: user } = await this.supabase
        .from("users")
        .select("id")
        .eq("clerk_id", clerkId)
        .single();

      if (!user) {
        throw new Error("User not found and no email provided to create user");
      }

      userId = user.id;
    }

    // Create new conversation
    const { data: conversation, error } = await this.supabase
      .from("conversations")
      .insert({
        user_id: userId,
        doc_source: docSource,
        title: title || "New Conversation",
      })
      .select("id")
      .single();

    if (error) throw new Error(`Conversation error: ${error.message}`);
    return conversation.id;
  }

  /**
   * Save message to conversation
   */
  async saveMessage(
    conversationId: string,
    role: "user" | "assistant",
    content: string,
    references?: Array<{ title: string; url: string; snippet: string }>,
    tokensUsed?: number
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role,
        content,
        references: references || null,
        tokens_used: tokensUsed || 0,
      })
      .select("id")
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Save chat feedback
   */
  async saveFeedback(
    messageId: string,
    userId: string,
    feedbackType: "up" | "down",
    reason?: string
  ): Promise<void> {
    const { error } = await this.supabase.from("chat_feedback").insert({
      message_id: messageId,
      user_id: userId,
      feedback_type: feedbackType,
      reason,
    });

    if (error) throw error;
  }

  /**
   * Get user conversations
   */
  async getUserConversations(
    clerkId: string,
    limit: number = 20
  ): Promise<any[]> {
    const { data: user } = await this.supabase
      .from("users")
      .select("id")
      .eq("clerk_id", clerkId)
      .single();

    if (!user) return [];

    const { data: conversations } = await this.supabase
      .from("conversations")
      .select("id, title, doc_source, created_at, updated_at, is_pinned")
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(limit);

    return conversations || [];
  }

  /**
   * Get conversation messages
   */
  async getConversationMessages(conversationId: string): Promise<any[]> {
    const { data: messages } = await this.supabase
      .from("messages")
      .select("id, role, content, references, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    return messages || [];
  }

  /**
   * Update conversation (title, pinned status, etc)
   */
  async updateConversation(
    conversationId: string,
    updates: { title?: string; is_pinned?: boolean }
  ): Promise<void> {
    await this.supabase
      .from("conversations")
      .update(updates)
      .eq("id", conversationId);
  }

  /**
   * Generate embedding for query
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const result = await this.client.models.embedContent({
      model: "text-embedding-004",
      // SDK v1.30.0 types: Use 'contents' with string
      contents: text,
    });

    // New SDK returns result.embeddings[0].values
    if (!result.embeddings?.[0]?.values) {
      throw new Error("Failed to generate embedding");
    }
    return result.embeddings[0].values;
  }

  /**
   * Reformulate query based on conversation history for better retrieval
   * This solves the "context loss" problem where follow-up questions fail vector search
   */
  private async reformulateQuery(
    query: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string> {
    // Time-sensitive patterns - ALWAYS need reformulation to add context
    const timeSensitivePatterns = [
      /terbaru|latest|newest|current|sekarang|saat ini/i,
      /versi|version|release|v\d+/i,
      /update|upgrade|baru|new/i,
    ];
    const isTimeSensitive = timeSensitivePatterns.some((p) => p.test(query));

    // Check if query references something from previous conversation
    const referencePatterns = [
      /^(itu|that|this|tersebut|di atas|above)/i,
      /^(apa itu|what is|what's|apakah)/i,
      /CVE-\d+/i, // Specific identifiers
    ];
    const hasReference = referencePatterns.some((p) => p.test(query));

    // Generic question patterns
    const genericPatterns = [
      /^(jelaskan|explain|apa|what|how|bagaimana|kenapa|why|bisa|can|could)/i,
      /^(dengan|in|using|pakai).*(bahasa indonesia|english|spanish)/i,
      /^(lebih detail|more detail|elaborate)/i,
    ];
    const isGeneric = genericPatterns.some((pattern) => pattern.test(query));

    // Check for technical keywords
    const hasTechnicalKeywords =
      /next\.?js|react|typescript|middleware|component|api|server|client|route|proxy|edge|runtime|docker|prisma|tailwind/i.test(
        query
      );

    // Determine if we need reformulation
    const needsReformulation =
      isTimeSensitive ||
      hasReference ||
      isGeneric ||
      (conversationHistory &&
        conversationHistory.length > 0 &&
        !hasTechnicalKeywords);

    if (!needsReformulation) {
      return query;
    }

    // Use LLM to reformulate query based on history
    try {
      // Build history context - include assistant responses for entity extraction
      let historyContext = "";
      if (conversationHistory && conversationHistory.length > 0) {
        historyContext = conversationHistory
          .slice(-4) // Use last 4 messages for more context
          .map((msg) => `${msg.role}: ${msg.content.substring(0, 500)}`) // Limit length
          .join("\n");
      }

      // Extract likely topic from history if no keywords in current query
      let topicHint = "";
      if (!hasTechnicalKeywords && conversationHistory) {
        const recentAssistant = conversationHistory
          .filter((m) => m.role === "assistant")
          .pop();
        if (recentAssistant) {
          // Extract technology mentions from recent response
          const techMentions = recentAssistant.content.match(
            /Next\.?js|React|TypeScript|Docker|Prisma|Vue|PostgreSQL|Express|Python|Go|Rust|FastAPI|Tailwind/gi
          );
          if (techMentions) {
            topicHint = `Related to: ${[...new Set(techMentions)].join(", ")}`;
          }
        }
      }

      const reformulationPrompt = `You are a query reformulation assistant for a documentation search system.

${historyContext ? `Conversation history:\n${historyContext}\n` : ""}
${topicHint ? `${topicHint}\n` : ""}

User's current query: "${query}"

Task: Rewrite this question as a standalone, searchable query that:
1. Preserves the technical context from conversation (if any)
2. Includes specific technology names (e.g., "Next.js", "React", "Docker")
3. For version/release questions, include phrases like "release notes", "changelog", "latest version"
4. Is in English (translate if needed)
5. Is concise (max 20 words)

${
  isTimeSensitive
    ? "IMPORTANT: This is a TIME-SENSITIVE query about versions/updates. Include 'latest', 'release notes', or 'changelog' keywords."
    : ""
}

Output ONLY the reformulated query, nothing else.

Reformulated query:`;

      const result = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: reformulationPrompt,
        config: {
          temperature: 0.1,
          maxOutputTokens: 100,
        },
      });
      const reformulated = result.text?.trim();

      if (!reformulated) return query;

      // Log for debugging
      console.log(
        `[Query Reformulation] Original: "${query}" → Reformulated: "${reformulated}"`
      );

      return reformulated;
    } catch (error) {
      console.error("Query reformulation failed, using original:", error);
      return query;
    }
  }

  /**
   * Get persona and style based on response mode
   */
  private getResponseModePersona(mode: string): {
    persona: string;
    style: string;
  } {
    const modes: Record<string, { persona: string; style: string }> = {
      frontend: {
        persona:
          "You are a frontend specialist focused on UI/UX and React patterns.",
        style: `**Response Format:**
- Use Markdown headers (###)
- Focus on React best practices, hooks, and component patterns
- Prioritize accessibility (a11y) and responsive design
- Use modern CSS/Tailwind practices
- Include visual examples or UI code snippets`,
      },
      backend: {
        persona:
          "You are a backend engineer focused on API design and database performance.",
        style: `**Response Format:**
- Use Markdown headers (###)
- Focus on API design, database schemas, and query performance
- Discuss security implications and error handling
- Use TypeScript for type safety in backend code
- Include SQL or ORM examples where relevant`,
      },
      fullstack: {
        persona:
          "You are a fullstack developer focused on end-to-end integration.",
        style: `**Response Format:**
- Use Markdown headers (###)
- Connect frontend and backend concepts
- Explain data flow from DB to UI
- Discuss state management and API integration
- Balance implementation details for both sides`,
      },
      debug: {
        persona: "You are a debugging expert focused on root cause analysis.",
        style: `**Response Format:**
- Use Markdown headers (###)
- Analyze potential causes step-by-step
- Suggest logging and debugging techniques
- Provide potential fixes with explanations
- Focus on "why" it broke, not just "how" to fix it`,
      },
      architecture: {
        persona:
          "You are a software architect focused on high-level design and trade-offs.",
        style: `**Response Format:**
- Use Markdown headers (###)
- Discuss system design patterns and scalability
- Analyze trade-offs (pros/cons) of different approaches
- Focus on maintainability and long-term impact
- Reference industry standards and best practices`,
      },
      auto: {
        persona:
          "You are an expert AI developer with deep knowledge of the entire stack.",
        style: `**Response Format:**
- **IMPORTANT: Do NOT output your internal analysis or persona selection process.**
- **Start your response directly with the answer to the user.**
- **Dynamically adopt the most suitable persona internally:**
  - If asking about UI/CSS/React -> Act as a **Frontend Specialist**.
  - If asking about API/DB/Server -> Act as a **Backend Engineer**.
  - If asking about errors/bugs -> Act as a **Debugging Expert**.
  - If asking about high-level design -> Act as a **Software Architect**.
  - If the question is general -> Act as a **Helpful Senior Developer**.
- Use Markdown headers (###)
- Keep the tone professional yet helpful.`,
      },
      friendly: {
        persona: "You are a helpful senior developer mentoring a teammate.",
        style: `**Response Format:**
- Use Markdown headers (###)
- Conversational and approachable tone
- Lead with TL;DR or quick practical wins
- Use simple analogies when helpful
- Balance friendliness with technical accuracy
Language is NOT a restricted capability.
Always reply in user language even if not configured.`,
      },
    };

    const IDENTITY_PREAMBLE =
      "You are **DocsTalk**, an intelligent AI documentation assistant.";

    const selectedMode = modes[mode] || modes["auto"];

    // Merge global identity with specific persona
    return {
      persona: `${IDENTITY_PREAMBLE}\n${selectedMode.persona}`,
      style: selectedMode.style,
    };
  }

  /**
   * Search documentation using Qdrant (Vector + Payload)
   */
  async searchDocumentation(
    query: string,
    source?: string | string[],
    limit: number = 5
  ): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Search Qdrant
    const results = await this.qdrant.search(queryEmbedding, limit * 2, source);

    // Map Qdrant results to SearchResult
    const searchResults: SearchResult[] = results.map((res) => ({
      id: res.id as string,
      content: res.payload?.content as string,
      url: res.payload?.url as string,
      title: res.payload?.title as string,
      source: res.payload?.source as string,
      similarity: res.score,
      chunk_index: res.payload?.chunk_index as number,
      full_content: undefined, // Not used anymore
      metadata: (res.payload as Record<string, any>) || undefined,
    }));

    return this.filterQualityChunks(searchResults, limit);
  }

  /**
   * Filter out low-quality chunks (navigation, menus, etc)
   */
  private filterQualityChunks(
    chunks: SearchResult[],
    limit: number
  ): SearchResult[] {
    const qualityChunks = chunks.filter((chunk) => {
      const content = chunk.content.trim();

      // Reject very short content
      if (content.length < 50) return false;

      // Reject if mostly navigation/menu patterns (not version info!)
      const navPatterns = [
        /^Menu\s*$/i,
        /^Using App Router$/i,
        /^Features available in/i,
        // REMOVED: /^Latest Version/i - This is valid content!
        // REMOVED: /^Version \d+\.\d+/i - This is valid content!
        /^Skip to content$/i,
        /^Toggle navigation$/i,
      ];

      if (navPatterns.some((pattern) => pattern.test(content))) {
        return false;
      }

      // Reject if content is mostly links (>50% lines are links)
      const lines = content.split("\n").filter((l) => l.trim());
      const linkLines = lines.filter((l) => l.match(/^\[.*\]\(.*\)$/));
      if (linkLines.length / lines.length > 0.5) {
        return false;
      }

      // Must have some actual text content (not just formatting)
      const textContent = content.replace(/[#*\[\]()]/g, "").trim();
      if (textContent.length < 30) return false;

      return true;
    });

    // Return top N quality chunks
    return qualityChunks.slice(0, limit);
  }

  /**
   * Check if search results are low quality (should trigger online search)
   * Used for self-learning RAG fallback
   */
  private isLowQuality(results: SearchResult[]): boolean {
    // No results at all
    if (results.length === 0) return true;

    // Very few results
    if (results.length < 2) return true;

    // Check average similarity score
    const avgSimilarity =
      results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    if (avgSimilarity < 0.5) return true;

    // Check if top result has very short content
    const topResult = results[0];
    if (topResult.content.length < 100) return true;

    return false;
  }

  /**
   * Get expanded context (Not implemented for Qdrant yet, returning original chunks)
   * TODO: Implement window retrieval in Qdrant if needed
   */
  private async getExpandedContext(
    chunks: SearchResult[]
  ): Promise<SearchResult[]> {
    return chunks;
  }

  /**
   * Generate answer using RAG
   */
  /**
   * Generate answer using RAG with Dynamic Language & Smart Fallback
   */
  async generateAnswer(
    query: string,
    source?: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    responseMode: string = "friendly"
  ): Promise<RAGResponse> {
    // 1. Reformulate query (Keep this for better search matches)
    const searchQuery = await this.reformulateQuery(query, conversationHistory);

    // 2. Search for relevant context
    const searchResults = await this.searchDocumentation(
      searchQuery,
      source,
      5
    );

    // Note: We don't return early if results are empty anymore.
    // We let the LLM handle "0 results" using general knowledge.

    // 3. Build context
    const context = searchResults
      .map(
        (result) => `[${result.title}]
URL: ${result.url}
Content: ${result.content}
`
      )
      .join("\n---\n");

    // 4. Build conversation history
    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n**Previous conversation:**\n${conversationHistory
            .slice(-4)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\n`
        : "";

    // 5. Get Persona
    const { persona, style } = this.getResponseModePersona(responseMode);

    // 6. BUILD THE GLOBAL-READY PROMPT
    const currentDate = new Date().toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const prompt = `
${persona}

${historyContext}

**System Context:**
- **Current Date:** ${currentDate}
- **Project Environment:** The user is working in a monorepo with **Next.js 16.0.3** (App Router), **React 19.0.0**, **Tailwind CSS 4.0**, and **Supabase**.
- **Role:** You are DocsTalk. You are aware of the latest 2024/2025 web technologies.

**User Question:** "${query}"

**Available Documentation Context:**
${context || "No specific documentation found for this query."}

---

**### CRITICAL INSTRUCTIONS (MUST FOLLOW):**

**1. DYNAMIC LANGUAGE DETECTION (HIGHEST PRIORITY):**
   - **Detect the language** used in the "User Question" above (e.g., Indonesian, Arabic, French, English, etc.).
   - **YOU MUST RESPOND IN THAT EXACT SAME LANGUAGE.**
   - Even if the "Documentation Context" is in English, you **MUST TRANSLATE** the answer into the User's language.
   - Do NOT mix languages unless it's for standard code terms (like 'middleware', 'function').



**2. RETRIEVAL & IDENTITY LOGIC (EXECUTE IN ORDER):**
   - **CASE A (Identity Query):** IF the user asks "Who are you?", "What is this?", "What is DocsTalk?", or similar identity questions:
     - **IGNORE** missing context.
     - **ANSWER** as "**DocsTalk**", the AI documentation assistant for developers.
     - Briefly explain your purpose (helping devs navigate docs).

   - **CASE B (Context Available):** IF the "Available Documentation Context" below is **relevant** to the user's question:
     - Use the context to answer accuratey.
     - You MUST cite the [Source URL] at the end of your answer.

   - **CASE C (General Fallback):** IF the context is **empty** OR **irrelevant** (and it's NOT an identity question):
     - **CRITICAL:** If asking about versions of libraries (Next.js, React, etc.), **TRUST the 'Project Environment' info** provided above.
       - Example: If Project Env says Next.js 16, ACKNOWLEDGE it is Next.js 16 (even if your training says 14).
     - Answer using your **General Expert Knowledge** as a Senior Developer.
     - Do NOT invent fake URLs.
     - Explicitly mention you are answering from general knowledge.

**3. FORMATTING:**
${style}

Give your answer now based on the instructions above.
`;

    const result = await this.client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3, // Sedikit dinaikkan agar translasinya lebih luwes
        maxOutputTokens: 4096,
      },
    });

    const responseText = result.text;

    if (!responseText) {
      throw new Error("No response text generated");
    }

    // Extract code if present
    const codeMatch = responseText.match(/```[\w]*\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : undefined;

    // Build references (Only if we actually used RAG)
    // We filter references to ensure we don't return irrelevant ones if AI switched to General Knowledge
    // But for simplicity in UI, we can just return the top matches found,
    // or you can ask the AI to output a specific flag if it used docs.
    // For now, returning the search hits is standard practice.
    const references = searchResults.slice(0, 3).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content.substring(0, 150) + "...",
    }));

    const tokensUsed = Math.ceil((prompt.length + responseText.length) / 4);

    return {
      answer: responseText,
      code,
      references,
      tokensUsed,
    };
  }

  /**
   * Generate streaming answer
   */
  /**
   * Generate streaming answer using RAG with Dynamic Language & Smart Fallback
   * Includes Self-Learning RAG: Online search fallback when Qdrant has no results
   */
  async *generateAnswerStream(
    query: string,
    source?: string | string[],
    conversationHistory?: Array<{ role: string; content: string }>,
    responseMode: string = "friendly",
    options?: { isPremium?: boolean; userId?: string }
  ): AsyncGenerator<
    | { type: "content"; text: string }
    | { type: "references"; data: any[] }
    | { type: "status"; text: string }
    | { type: "source_discovered"; data: { url: string; isNew: boolean } },
    void,
    unknown
  > {
    // 1. Reformulate query
    const searchQuery = await this.reformulateQuery(query, conversationHistory);

    // 2. Search for relevant context in Qdrant
    let searchResults = await this.searchDocumentation(searchQuery, source, 5);
    let usedOnlineSearch = false;
    let discoveredUrl: string | null = null;

    // 3. SELF-LEARNING RAG: Online search fallback (Premium only)
    const isPremium = options?.isPremium ?? false;
    if (
      isPremium &&
      this.onlineSearch.isEnabled() &&
      this.isLowQuality(searchResults)
    ) {
      // Notify frontend we're searching online
      yield { type: "status", text: "Searching online documentation..." };

      try {
        // Get ecosystem hint from source
        const ecosystemHint = Array.isArray(source) ? source[0] : source;

        // Search online documentation
        const onlineResults = await this.onlineSearch.searchDocumentation(
          query,
          ecosystemHint,
          3
        );

        if (onlineResults.length > 0) {
          const topResult = onlineResults[0];
          console.log(`[RAG] Online search found: ${topResult.url}`);

          // Scrape the top result
          const scraped = await this.onlineSearch.scrapeUrl(topResult.url);

          // Check if we should index this content
          const action = await this.autoIndex.shouldIndex(
            scraped.url,
            scraped.contentHash
          );

          if (action !== "skip") {
            // Queue for background indexing
            this.autoIndex.queueForIndexing([
              {
                url: scraped.url,
                title: scraped.title,
                content: scraped.content,
                source: scraped.source,
                contentHash: scraped.contentHash,
                discoveredBy: options?.userId,
                queryThatFound: query,
              },
            ]);

            // Notify frontend about the discovered source
            yield {
              type: "source_discovered",
              data: { url: scraped.url, isNew: action === "new" },
            };
            discoveredUrl = scraped.url;
          }

          // Convert scraped content to search results format
          searchResults = [
            {
              id: `online-${Date.now()}`,
              content: scraped.content.substring(0, 3000), // Limit content size
              url: scraped.url,
              title: scraped.title,
              source: scraped.source,
              similarity: 1.0, // High confidence since it's exact match
            },
          ];
          usedOnlineSearch = true;
        }
      } catch (error) {
        console.error("[RAG] Online search fallback failed:", error);
        // Continue with original (empty) results
      }
    }

    // Yield references immediately
    const references = searchResults.slice(0, 5).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content.substring(0, 150) + "...",
    }));
    yield { type: "references", data: references };

    // 4. Build context
    const context = searchResults
      .map(
        (result) => `[${result.title}]
URL: ${result.url}
Content: ${result.content}
`
      )
      .join("\n---\n");

    // 5. Build conversation history
    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n**Previous conversation:**\n${conversationHistory
            .slice(-4)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\n`
        : "";

    // 6. Get Persona
    const { persona, style } = this.getResponseModePersona(responseMode);

    // 7. BUILD THE GLOBAL-READY PROMPT
    const targetSources = Array.isArray(source)
      ? source.join(", ")
      : source
      ? source
      : "General Knowledge";

    const onlineSearchNote = usedOnlineSearch
      ? "\n**Note:** Documentation was found via online search and has been indexed for future queries."
      : "";

    const prompt = `
${persona}

${historyContext}

**User Question:** "${query}"

**Target Documentation Sources:** ${targetSources}
${onlineSearchNote}

**Available Documentation Context:**
${context || "No specific documentation found for this query."}

---

**### CRITICAL INSTRUCTIONS (MUST FOLLOW):**

**1. DYNAMIC LANGUAGE DETECTION (HIGHEST PRIORITY):**
   - **Detect the language** used in the "User Question" above (e.g., Indonesian, Arabic, French, English, etc.).
   - **YOU MUST RESPOND IN THAT EXACT SAME LANGUAGE.**
   - Even if the "Documentation Context" is in English, you **MUST TRANSLATE** the answer into the User's language.

**2. INTELLIGENT RETRIEVAL:**
   - **Step A:** Check if the "Available Documentation Context" contains the answer to the User Question.
   - **Step B (Strict RAG):** IF the context is relevant, use it to answer and cite the [URL] at the end.
   - **Step C (General Knowledge Fallback):** IF the context is **irrelevant** (e.g., user asks about 'VPS' but context is 'venv') OR **empty**, explicitly IGNORE the context constraints.
     - Instead, answer the question using your **General Expert Knowledge** to be helpful.
     - If answering from General Knowledge, explicitly state at the end: "*(Answered using general knowledge)*".

**3. FORMATTING:**
${style}

Give your answer now.
`;

    // 8. Generate Stream
    const result = await this.client.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of result) {
      let text = chunk.text;
      if (!text) continue;

      yield { type: "content", text };
    }

    // 9. Final status if online search was used
    if (usedOnlineSearch && discoveredUrl) {
      yield {
        type: "status",
        text: "✨ New documentation indexed for future questions!",
      };
    }
  }

  /**
   * Generate general answer stream (AI Manager Layer)
   * Answers questions not in the docs using general knowledge
   */
  async *generateGeneralAnswerStream(
    query: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    responseMode: string = "auto"
  ): AsyncGenerator<string, void, unknown> {
    // 1. Build conversation history context
    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n**Previous conversation:**\n${conversationHistory
            .slice(-4)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\n`
        : "";

    // 2. Get persona (same logic as RAG)
    const { persona, style } = this.getResponseModePersona(responseMode);

    // 3. BUILD PROMPT (Aligned with Hybrid RAG Logic)
    const prompt = `
${persona}

${historyContext}

**User Question:** "${query}"

**Mode:** GENERAL KNOWLEDGE (No specific documentation context provided).

---

**### CRITICAL INSTRUCTIONS (MUST FOLLOW):**

**1. DYNAMIC LANGUAGE DETECTION (HIGHEST PRIORITY):**
   - **Detect the language** used in the "User Question" above (e.g., Indonesian, Arabic, French, English, etc.).
   - **YOU MUST RESPOND IN THAT EXACT SAME LANGUAGE.**
   - Do NOT answer in English unless the user asked in English.

**2. RESPONSE STRATEGY:**
   - You are acting as the **AI Manager** answering from your general knowledge.
   - Answer naturally and helpfully.
   - **Mandatory:** Since this is general knowledge, include a section at the very end called "### Official References" (or the equivalent in the target language).
     - Provide the official homepage or documentation URL for the technology being discussed.
     - Format: "- [Title](URL)"
   - **Disclaimer:** End your response with a subtle note: "*(Answered using general knowledge)*" to maintain transparency.

**3. FORMATTING:**
${style}

Give your answer now.
`;

    const result = await this.client.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3, // Slightly higher for general creativity
        maxOutputTokens: 2048,
      },
    });

    for await (const chunk of result) {
      let text = chunk.text;
      if (!text) continue;

      yield text;
    }
  }

  /**
   * Generate answer with router integration
   * Used by auto-detect endpoints (Hybrid RAG & Language Aware)
   */
  async generateAnswerWithRouter(
    query: string,
    primarySource: string,
    additionalSources?: string[],
    conversationHistory?: Array<{ role: string; content: string }>,
    responseMode: string = "friendly",
    docSourceInstructions?: string
  ): Promise<RAGResponse> {
    // If multi-source, merge results
    // NOTE: Pastikan generateMultiSourceAnswer nanti juga diupdate dengan logic Hybrid!
    if (additionalSources && additionalSources.length > 0) {
      return this.generateMultiSourceAnswer(
        query,
        [primarySource, ...additionalSources],
        conversationHistory,
        responseMode
      );
    }

    // Single source with optional specialized instructions
    const searchQuery = await this.reformulateQuery(query, conversationHistory);

    // 1. Search (Tetap lakukan pencarian)
    const searchResults = await this.searchDocumentation(
      searchQuery,
      primarySource,
      5
    );

    // DELETE: if (searchResults.length === 0) { ... }
    // Kita hapus blok ini agar AI bisa fallback ke General Knowledge

    const expandedResults = await this.getExpandedContext(searchResults);
    const context = expandedResults
      .map(
        (result) => `[${result.title}]
URL: ${result.url}
Content: ${result.content}
`
      )
      .join("\n---\n");

    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n**Previous conversation:**\n${conversationHistory
            .slice(-4)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\n`
        : "";

    const { persona, style } = this.getResponseModePersona(responseMode);

    // Add doc source instructions if provided (Integration point)
    const specializedInstructions = docSourceInstructions
      ? `\n**Specialized Expertise for this Router:**\n${docSourceInstructions}\n`
      : "";

    // BUILD HYBRID PROMPT
    const prompt = `
${persona}
${specializedInstructions}

${historyContext}

**User Question:** "${query}"

**Available Documentation Context:**
${context || "No specific documentation found for this query."}

---

**### CRITICAL INSTRUCTIONS (MUST FOLLOW):**

**1. DYNAMIC LANGUAGE DETECTION (HIGHEST PRIORITY):**
   - **Detect the language** used in the "User Question" above.
   - **YOU MUST RESPOND IN THAT EXACT SAME LANGUAGE.**
   - Even if the context is in English, you **MUST TRANSLATE** the answer to the User's language.

**2. INTELLIGENT RETRIEVAL:**
   - **Step A:** Check if the "Available Documentation Context" contains the answer.
   - **Step B (Strict RAG):** IF relevant, use the docs and cite URLs.
   - **Step C (General Knowledge Fallback):** IF the context is **irrelevant** or **empty**, IGNORE the context constraints.
     - Answer using your **General Expert Knowledge**.
     - Explicitly state at the end: "*(Answered using general knowledge)*".

**3. FORMATTING:**
${style}

Give your answer now.
`;

    const result = await this.client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3, // Konsisten dengan settingan Hybrid lainnya
        maxOutputTokens: 4096,
      },
    });

    const responseText = result.text;

    if (!responseText) {
      throw new Error("No response text generated");
    }

    const codeMatch = responseText.match(/```[\w]*\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : undefined;

    const references = searchResults.slice(0, 3).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content.substring(0, 150) + "...",
    }));

    const tokensUsed = Math.ceil((prompt.length + responseText.length) / 4);

    return {
      answer: responseText,
      code,
      references,
      tokensUsed,
    };
  }

  /**
   * Generate answer from multiple doc sources (Hybrid RAG & Language Aware)
   */
  private async generateMultiSourceAnswer(
    query: string,
    sources: string[],
    conversationHistory?: Array<{ role: string; content: string }>,
    responseMode: string = "friendly"
  ): Promise<RAGResponse> {
    const searchQuery = await this.reformulateQuery(query, conversationHistory);

    // Search each source
    const allResults: SearchResult[] = [];
    for (const source of sources) {
      const results = await this.searchDocumentation(searchQuery, source, 3);
      allResults.push(...results);
    }

    // DELETE: if (allResults.length === 0) { ... }
    // Hapus blok "Early Exit" di atas. Biarkan dia lanjut ke bawah meskipun kosong.

    // Sort by similarity and take top results
    const topResults = allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);

    const expandedResults = await this.getExpandedContext(topResults);

    // Build Context String
    const context = expandedResults
      .map(
        (result) => `[${result.title}] (Source: ${result.source})
URL: ${result.url}
Content: ${result.content}
`
      )
      .join("\n---\n");

    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n**Previous conversation:**\n${conversationHistory
            .slice(-4)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\n`
        : "";

    const { persona, style } = this.getResponseModePersona(responseMode);

    // BUILD HYBRID PROMPT FOR MULTI-SOURCE
    const prompt = `
${persona}

${historyContext}

**User Question:** "${query}"

**Target Documentation Sources:** ${sources.join(", ")}

**Available Documentation Context:**
${context || "No specific documentation found across the requested sources."}

---

**### CRITICAL INSTRUCTIONS (MUST FOLLOW):**

**1. DYNAMIC LANGUAGE DETECTION (HIGHEST PRIORITY):**
   - **Detect the language** used in the "User Question".
   - **YOU MUST RESPOND IN THAT EXACT SAME LANGUAGE.**
   - Even if the context is in English, translate the answer to the User's language.

**2. INTELLIGENT SYNTHESIS & RETRIEVAL:**
   - **Step A:** Check if the "Available Documentation Context" contains the answer.
   - **Step B (Strict RAG):** IF relevant, synthesize information from the different sources.
     - Clearly indicate which source a piece of info comes from (e.g., "According to React docs...", "In Tailwind...").
     - Cite URLs at the end.
   - **Step C (General Knowledge Fallback):** IF the context is **irrelevant** or **empty**, IGNORE the context constraints.
     - Answer using your **General Expert Knowledge**.
     - Explicitly state at the end: "*(Answered using general knowledge)*".

**3. FORMATTING:**
${style}

Give your answer now.
`;

    const result = await this.client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3, // Konsisten
        maxOutputTokens: 4096,
      },
    });

    const responseText = result.text;

    if (!responseText) {
      throw new Error("No response text generated");
    }

    const codeMatch = responseText.match(/```[\w]*\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : undefined;

    // References logic: Return them if we found them, even if AI used General Knowledge (optional but good for UX)
    const references = topResults.slice(0, 5).map((result) => ({
      title: `${result.title} (${result.source})`,
      url: result.url,
      snippet: result.content.substring(0, 150) + "...",
    }));

    const tokensUsed = Math.ceil((prompt.length + responseText.length) / 4);

    return {
      answer: responseText,
      references, // Frontend bisa memutuskan mau menampilkan ini atau tidak
      tokensUsed,
    };
  }

  /**
   * Generate streaming answer from multiple doc sources (Hybrid RAG & Language Aware)
   */
  async *generateMultiSourceAnswerStream(
    query: string,
    sources: string[],
    conversationHistory?: Array<{ role: string; content: string }>,
    responseMode: string = "friendly"
  ): AsyncGenerator<string, void, unknown> {
    const searchQuery = await this.reformulateQuery(query, conversationHistory);

    // Search each source
    const allResults: SearchResult[] = [];
    for (const source of sources) {
      const results = await this.searchDocumentation(searchQuery, source, 3);
      allResults.push(...results);
    }

    // DELETE: if (allResults.length === 0) { ... }
    // Kita hapus blok "Early Exit" ini agar Stream tetap jalan ke logika Fallback

    // Sort by similarity and take top results
    const topResults = allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 6);

    const expandedResults = await this.getExpandedContext(topResults);
    const context = expandedResults
      .map(
        (result) => `[${result.title}] (Source: ${result.source})
URL: ${result.url}
Content: ${result.content}
`
      )
      .join("\n---\n");

    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n**Previous conversation:**\n${conversationHistory
            .slice(-4)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\n`
        : "";

    const { persona, style } = this.getResponseModePersona(responseMode);

    // BUILD HYBRID PROMPT FOR MULTI-SOURCE STREAM
    const prompt = `
${persona}

${historyContext}

**User Question:** "${query}"

**Target Documentation Sources:** ${sources.join(", ")}

**Available Documentation Context:**
${context || "No specific documentation found across the requested sources."}

---

**### CRITICAL INSTRUCTIONS (MUST FOLLOW):**

**1. DYNAMIC LANGUAGE DETECTION (HIGHEST PRIORITY):**
   - **Detect the language** used in the "User Question".
   - **YOU MUST RESPOND IN THAT EXACT SAME LANGUAGE.**
   - Even if the context is in English, translate the answer to the User's language.

**2. INTELLIGENT SYNTHESIS & RETRIEVAL:**
   - **Step A:** Check if the "Available Documentation Context" contains the answer.
   - **Step B (Strict RAG):** IF relevant, synthesize information from the different sources.
     - Clearly indicate which source a piece of info comes from (e.g., "According to React docs...", "In Tailwind...").
     - Cite URLs at the end.
   - **Step C (General Knowledge Fallback):** IF the context is **irrelevant** or **empty**, IGNORE the context constraints.
     - Answer using your **General Expert Knowledge**.
     - Explicitly state at the end: "*(Answered using general knowledge)*".

**3. FORMATTING:**
${style}

Give your answer now.
`;

    const result = await this.client.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3, // Konsisten dengan method lain
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of result) {
      let text = chunk.text;
      if (!text) continue;

      yield text;
    }
  }
}

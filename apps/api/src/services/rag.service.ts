import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
  references: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  tokensUsed: number;
}

export class RAGService {
  private genAI: GoogleGenerativeAI;
  public supabase: SupabaseClient;
  private model: GenerativeModel;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
  ): Promise<void> {
    await this.supabase.from("messages").insert({
      conversation_id: conversationId,
      role,
      content,
      references: references || null,
      tokens_used: tokensUsed || 0,
    });
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
      .select("id, title, doc_source, created_at, updated_at")
      .eq("user_id", user.id)
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
   * Update conversation title
   */
  async updateConversationTitle(
    conversationId: string,
    title: string
  ): Promise<void> {
    await this.supabase
      .from("conversations")
      .update({ title })
      .eq("id", conversationId);
  }

  /**
   * Generate embedding for query
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({
      model: "text-embedding-004",
    });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  /**
   * Reformulate query based on conversation history for better retrieval
   * This solves the "context loss" problem where follow-up questions fail vector search
   */
  private async reformulateQuery(
    query: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<string> {
    // If no history or query is already detailed, return as-is
    if (!conversationHistory || conversationHistory.length === 0) {
      return query;
    }

    // Check if query is too generic (needs reformulation)
    const genericPatterns = [
      /^(jelaskan|explain|apa|what|how|bagaimana|kenapa|why|bisa|can|could)/i,
      /^(dengan|in|using|pakai).*(bahasa indonesia|english|spanish)/i,
      /^(lebih detail|more detail|elaborate)/i,
    ];

    const isGeneric = genericPatterns.some((pattern) => pattern.test(query));

    // If query has technical keywords, probably doesn't need reformulation
    const hasTechnicalKeywords =
      /next\.?js|react|typescript|middleware|component|api|server|client|route|proxy|edge|runtime/i.test(
        query
      );

    if (!isGeneric && hasTechnicalKeywords) {
      return query;
    }

    // Use LLM to reformulate query based on history
    try {
      const model = this.genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
          temperature: 0.1, // Low temp for consistent reformulation
          maxOutputTokens: 100,
        },
      });

      const historyContext = conversationHistory
        .slice(-3) // Use last 3 messages for context
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join("\n");

      const reformulationPrompt = `Given this conversation history:

${historyContext}

The user now asks: "${query}"

Task: Rewrite this question as a standalone, searchable query that:
1. Preserves the technical context from conversation history
2. Includes relevant keywords for documentation search
3. Is in English (even if user asked in Indonesian)
4. Is concise (max 15 words)

Output ONLY the reformulated query, nothing else.

Reformulated query:`;

      const result = await model.generateContent(reformulationPrompt);
      const reformulated = result.response.text().trim();

      // Log for debugging
      console.log(
        `[Query Reformulation] Original: "${query}" → Reformulated: "${reformulated}"`
      );

      return reformulated;
    } catch (error) {
      console.error("Query reformulation failed, using original:", error);
      return query; // Fallback to original on error
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
      formal: {
        persona:
          "You are a technical documentation writer creating official reference material.",
        style: `**Response Format:**
- Professional, structured, and precise language
- Complete sentences with formal tone
- Structure: Introduction → Technical Details → Code Examples → References
- Suitable for official documentation or technical reports`,
      },
      friendly: {
        persona: "You are a helpful senior developer mentoring a teammate.",
        style: `**Response Format:**
- Conversational and approachable tone
- Lead with TL;DR or quick practical wins
- Use simple analogies when helpful
- Balance friendliness with technical accuracy`,
      },
      "bimbingan-belajar": {
        persona:
          "You are a patient coding instructor teaching concepts step-by-step.",
        style: `**Response Format:**
- Break down concepts into clear, numbered steps
- Use analogies and real-world examples
- Explain "why" behind each concept, not just "how"
- Include learning tips and common pitfalls
- Encourage understanding over memorization`,
      },
      simple: {
        persona: "You are a pragmatic developer who values efficiency.",
        style: `**Response Format:**
- Ultra-concise, no fluff or filler words
- Bullet points over paragraphs
- Code first, minimal explanation
- Action-oriented language (Do X, Use Y, Avoid Z)
- Maximum 5-6 sentences total`,
      },
      "technical-deep-dive": {
        persona:
          "You are a senior architect explaining implementation details.",
        style: `**Response Format:**
- Deep technical analysis with implementation specifics
- Discuss architecture, design patterns, and tradeoffs
- Reference internals, edge cases, and performance implications
- Include best practices and anti-patterns
- Suitable for code reviews or refactoring discussions`,
      },
      "example-heavy": {
        persona: "You are a code-focused developer who learns by doing.",
        style: `**Response Format:**
- Prioritize working code examples above all
- Minimal theory - show, don't tell
- Multiple examples for different use cases
- Include expected output/behavior in comments
- Let the code speak for itself`,
      },
      "summary-only": {
        persona: "You are creating a quick reference or cheat sheet.",
        style: `**Response Format:**
- Extremely brief - 3-4 sentences maximum
- Key takeaways only, no elaboration
- Bullet list format preferred
- No code unless absolutely critical
- Think: what fits on a sticky note?`,
      },
    };

    return modes[mode] || modes["friendly"]; // Default to friendly
  }

  /**
   * Search documentation using vector similarity with enhanced context
   */
  async searchDocumentation(
    query: string,
    source?: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Use new search_docs_with_context RPC function with LOWER threshold
    const { data, error } = await this.supabase.rpc(
      "search_docs_with_context",
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.65, // Lowered from 0.7 for better recall
        match_count: limit * 2, // Get more candidates for quality filtering
        filter_source: source || null,
        include_context: true,
      }
    );

    if (error) {
      // Fallback to old search_docs if migration not applied yet
      console.warn(
        "search_docs_with_context not available, falling back to search_docs"
      );
      const { data: fallbackData, error: fallbackError } =
        await this.supabase.rpc("search_docs", {
          query_embedding: queryEmbedding,
          match_threshold: 0.65,
          match_count: limit * 2,
          filter_source: source || null,
        });

      if (fallbackError) {
        throw new Error(`Search error: ${fallbackError.message}`);
      }

      return this.filterQualityChunks(fallbackData || [], limit);
    }

    return this.filterQualityChunks(data || [], limit);
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

      // Reject if mostly navigation/menu patterns
      const navPatterns = [
        /^Menu\s*$/i,
        /^Using App Router$/i,
        /^Features available in/i,
        /^Latest Version/i,
        /^Version \d+\.\d+/i,
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
   * Get expanded context by retrieving surrounding chunks
   * Uses new chunk_index field from migration
   */
  private async getExpandedContext(
    chunks: SearchResult[]
  ): Promise<SearchResult[]> {
    if (chunks.length === 0) return [];

    const expandedChunks: SearchResult[] = [];
    const seenUrls = new Set<string>();

    // Prepare all query parameters
    const chunkRequests = chunks.map((chunk) => ({
      url: chunk.url,
      chunkIndex: chunk.chunk_index ?? chunk.metadata?.chunkIndex ?? 0,
      originalChunk: chunk,
    }));

    // Build OR conditions for all chunks in a single query
    let query = this.supabase
      .from("doc_chunks")
      .select(
        "id, content, url, title, source, chunk_index, full_content, metadata"
      );

    // Add OR conditions for each chunk's surrounding range
    for (const req of chunkRequests) {
      query = query.or(
        `and(url.eq.${req.url},chunk_index.gte.${Math.max(
          0,
          req.chunkIndex - 1
        )},chunk_index.lte.${req.chunkIndex + 1})`
      );
    }

    const { data: allSurroundingChunks } = await query
      .order("url")
      .order("chunk_index", { ascending: true });

    if (!allSurroundingChunks) {
      return chunks; // Fallback to original chunks
    }

    // Group surrounding chunks by URL and chunk index
    const chunksByUrl = new Map<string, any[]>();
    for (const sc of allSurroundingChunks) {
      const key = sc.url;
      if (!chunksByUrl.has(key)) {
        chunksByUrl.set(key, []);
      }
      chunksByUrl.get(key)!.push(sc);
    }

    // Process each original chunk with its surrounding chunks
    for (const req of chunkRequests) {
      const surroundingChunks = chunksByUrl.get(req.url) || [];

      // Filter to chunks in the range for this specific chunk
      const relevantChunks = surroundingChunks.filter(
        (sc) =>
          sc.chunk_index >= Math.max(0, req.chunkIndex - 1) &&
          sc.chunk_index <= req.chunkIndex + 1
      );

      if (relevantChunks.length > 0) {
        // Combine chunks for this URL
        const combinedContent = relevantChunks
          .map((c) => c.content)
          .join("\n\n");

        // Add unique expanded chunk
        const urlKey = `${req.url}-${req.chunkIndex}`;
        if (!seenUrls.has(urlKey)) {
          expandedChunks.push({
            ...req.originalChunk,
            content: combinedContent,
            id: urlKey,
            // Include full_content if available from first chunk
            full_content:
              relevantChunks[0]?.full_content || req.originalChunk.full_content,
          });
          seenUrls.add(urlKey);
        }
      } else {
        // Fallback to original chunk
        expandedChunks.push(req.originalChunk);
      }
    }

    return expandedChunks;
  }

  /**
   * Generate answer using RAG
   */
  async generateAnswer(
    query: string,
    source?: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    responseMode: string = "friendly"
  ): Promise<RAGResponse> {
    // 1. Reformulate query if needed (context-aware retrieval)
    const searchQuery = await this.reformulateQuery(query, conversationHistory);

    // 2. Search for relevant context using reformulated query
    const searchResults = await this.searchDocumentation(
      searchQuery,
      source,
      5
    );

    if (searchResults.length === 0) {
      return {
        answer:
          "I couldn't find relevant information in the documentation. Please try rephrasing your question.",
        references: [],
        tokensUsed: 0,
      };
    }

    // 2. Get expanded context with surrounding chunks
    const expandedResults = await this.getExpandedContext(searchResults);

    // 3. Build context from expanded results
    const context = expandedResults
      .map(
        (result) => `[${result.title}]
URL: ${result.url}
Content: ${result.content}
`
      )
      .join("\n---\n");

    // 4. Build conversation history context if available
    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n**Previous conversation:**\n${conversationHistory
            .slice(-4)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\n`
        : "";

    // 5. Generate answer with Gemini (with conversation context + v16 priority + response mode)
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2, // Low temperature for accuracy
        maxOutputTokens: 4096, // Increased from 2048 (2x for complex queries)
      },
    });

    // Get persona and style for selected mode
    const { persona, style } = this.getResponseModePersona(responseMode);

    const prompt = `${persona} ${historyContext}Your teammate asked:

**Question:** "${query}"

**Context:**
- Next.js v16 is LATEST (prioritize v16 > v15 > v14)
- Be accurate - only use info from docs below${
      conversationHistory && conversationHistory.length > 0
        ? " and conversation history"
        : ""
    }
${
  conversationHistory && conversationHistory.length > 0
    ? "- Remember our conversation - reference it if relevant\n"
    : ""
}
${style}

**Official Documentation:**

${context}

Give your answer now. Cite source URLs at the end.

Response:
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Extract code if present
    const codeMatch = responseText.match(/```[\w]*\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : undefined;

    // Build references
    const references = searchResults.slice(0, 3).map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.content.substring(0, 150) + "...",
    }));

    // Estimate tokens (rough approximation)
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
  async *generateAnswerStream(
    query: string,
    source?: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    responseMode: string = "friendly"
  ): AsyncGenerator<string, void, unknown> {
    // 1. Reformulate query if needed (context-aware retrieval)
    const searchQuery = await this.reformulateQuery(query, conversationHistory);

    // 2. Search for relevant context using reformulated query
    const searchResults = await this.searchDocumentation(
      searchQuery,
      source,
      5
    );

    if (searchResults.length === 0) {
      yield "I couldn't find relevant information in the documentation.";
      return;
    }

    // 2. Build context
    const context = searchResults
      .map(
        (result) => `[${result.title}]
URL: ${result.url}
Content: ${result.content}
`
      )
      .join("\n---\n");

    // 3. Build conversation history context
    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n**Previous conversation:**\n${conversationHistory
            .slice(-4)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\n`
        : "";

    // 4. Generate streaming answer (with conversation context + v16 priority + response mode)
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    const { persona, style } = this.getResponseModePersona(responseMode);

    const prompt = `${persona} ${historyContext}

**Context:**
- Next.js v16 is latest (prioritize v16 > v15 > v14)
${
  conversationHistory && conversationHistory.length > 0
    ? "- Remember our conversation - reference it if relevant\n"
    : ""
}
${style}

**Docs:**
${context}

**Question:** ${query}

Give your answer. Cite sources at the end.`;

    const result = await model.generateContentStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      yield text;
    }
  }
}

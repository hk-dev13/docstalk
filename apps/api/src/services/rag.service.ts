import { GoogleGenAI } from "@google/genai";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { QdrantService } from "./qdrant.service";

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

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
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
      contents: text,
    });
    // The new SDK returns embedding.values directly or inside embedding object depending on version?
    // Checking docs: result.embedding.values is correct for new SDK too?
    // Wait, new SDK docs say:
    // const response = await ai.models.embedContent({ model: 'text-embedding-004', contents: '...' });
    // console.log(response.embedding.values);
    // Let's assume it's similar but check if values is present.
    // Actually new SDK returns `EmbedContentResponse` which has `embedding` which has `values`.
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

      const result = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: reformulationPrompt,
        config: {
          temperature: 0.1, // Low temp for consistent reformulation
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
- Use Markdown headers (###) for sections
- Professional, structured, and precise language
- Complete sentences with formal tone
- Structure: Introduction → Technical Details → Code Examples → References
- Add blank lines between sections for readability`,
      },
      friendly: {
        persona: "You are a helpful senior developer mentoring a teammate.",
        style: `**Response Format:**
- Use Markdown headers (###) to organize the answer
- Conversational and approachable tone
- Lead with TL;DR or quick practical wins
- Use simple analogies when helpful
- Balance friendliness with technical accuracy
- Add blank lines between paragraphs and code blocks`,
      },
      tutor: {
        persona:
          "You are a patient coding instructor teaching concepts step-by-step.",
        style: `**Response Format:**
- Use Markdown headers (###) for each step or concept
- Break down concepts into clear, numbered steps
- Use analogies and real-world examples
- Explain "why" behind each concept, not just "how"
- Include learning tips and common pitfalls
- Encourage understanding over memorization`,
      },
      simple: {
        persona: "You are a pragmatic developer who values efficiency.",
        style: `**Response Format:**
- Use Markdown headers (###) for key points
- Ultra-concise, no fluff or filler words
- Use bullet points for lists
- Code first, minimal explanation
- Action-oriented language (Do X, Use Y, Avoid Z)
- Add blank lines between sections
- Maximum 5-6 sentences total explanation`,
      },
      technical_deep_dive: {
        persona:
          "You are a senior architect explaining implementation details.",
        style: `**Response Format:**
- Use Markdown headers (###) for architecture components
- Deep technical analysis with implementation specifics
- Discuss architecture, design patterns, and tradeoffs
- Reference internals, edge cases, and performance implications
- Include best practices and anti-patterns`,
      },
      example_heavy: {
        persona: "You are a code-focused developer who learns by doing.",
        style: `**Response Format:**
- Use Markdown headers (###) for each example
- Prioritize working code examples above all
- Minimal theory - show, don't tell
- Multiple examples for different use cases
- Include expected output/behavior in comments`,
      },
      summary_only: {
        persona: "You are creating a quick reference or cheat sheet.",
        style: `**Response Format:**
- Use Markdown headers (###) for topics
- Extremely brief - 3-4 sentences maximum
- Key takeaways only, no elaboration
- Bullet list format preferred
- No code unless absolutely critical`,
      },
    };

    return modes[mode] || modes["friendly"]; // Default to friendly
  }

  /**
   * Search documentation using Qdrant (Vector + Payload)
   */
  async searchDocumentation(
    query: string,
    source?: string,
    limit: number = 5
  ): Promise<SearchResult[]> {
    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);

    // Search Qdrant
    const qdrant = new QdrantService();
    const results = await qdrant.search(queryEmbedding, limit * 2, source);

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
    // Get persona and style for selected mode
    const { persona, style } = this.getResponseModePersona(responseMode);

    const prompt = `${persona} ${historyContext}Your teammate asked:

**Question:** "${query}"

**Context:**

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

IMPORTANT: ALWAYS respond in the same language as the user's question. If the user asks in Indonesian, respond in Indonesian. If in English, respond in English.

**Official Documentation:**

${context}

Give your answer now. Cite source URLs at the end.

IMPORTANT: Before answering, you MUST explicitly think through the problem step-by-step.
Output your thought process inside <thinking> tags.
For example:
<thinking>
1. Assessing the user's question...
2. Checking the provided context...
3. Formulating the explanation...
</thinking>
[Your actual answer here]

Response:
`;

    const result = await this.client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2, // Low temperature for accuracy
        maxOutputTokens: 4096, // Increased from 2048 (2x for complex queries)
      },
    });
    const responseText = result.text;

    if (!responseText) {
      throw new Error("No response text generated");
    }

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

    // Extract reasoning if present
    let reasoning: string | undefined;
    let finalAnswer = responseText;

    const thinkingMatch = responseText.match(
      /<thinking>([\s\S]*?)<\/thinking>/
    );
    if (thinkingMatch) {
      reasoning = thinkingMatch[1].trim();
      finalAnswer = responseText
        .replace(/<thinking>[\s\S]*?<\/thinking>/, "")
        .trim();
    }

    return {
      answer: finalAnswer,
      code,
      reasoning,
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
    const { persona, style } = this.getResponseModePersona(responseMode);

    const prompt = `${persona} ${historyContext}
    
**Context:**

${
  conversationHistory && conversationHistory.length > 0
    ? "- Remember our conversation - reference it if relevant\n"
    : ""
}
${style}

IMPORTANT: ALWAYS respond in the same language as the user's question. If the user asks in Indonesian, respond in Indonesian. If in English, respond in English.

IMPORTANT: Before answering, you MUST explicitly think through the problem step-by-step.
Output your thought process inside <thinking> tags.
For example:
<thinking>
1. Assessing the user's question...
2. Checking the provided context...
3. Formulating the explanation...
</thinking>
[Your actual answer here]

**Official Documentation:**

${context}

Response:
`;

    const result = await this.client.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  }

  /**
   * Generate answer with router integration
   * Used by auto-detect endpoints
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
    const searchResults = await this.searchDocumentation(
      searchQuery,
      primarySource,
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

    // Add doc source instructions if provided
    const specializedInstructions = docSourceInstructions
      ? `\n\n**Your Expertise:**\n${docSourceInstructions}\n`
      : "";

    const prompt = `${persona} ${historyContext}Your teammate asked:

**Question:** "${query}"

**Context:**

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
${specializedInstructions}

**Official Documentation:**

${context}

Give your answer now. Cite source URLs at the end.

IMPORTANT: Before answering, you MUST explicitly think through the problem step-by-step.
Output your thought process inside <thinking> tags.

Response:
`;

    const result = await this.client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
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

    let reasoning: string | undefined;
    let finalAnswer = responseText;

    const thinkingMatch = responseText.match(
      /<thinking>([\s\S]*?)<\/thinking>/
    );
    if (thinkingMatch) {
      reasoning = thinkingMatch[1].trim();
      finalAnswer = responseText
        .replace(/<thinking>[\s\S]*?<\/thinking>/, "")
        .trim();
    }

    return {
      answer: finalAnswer,
      code,
      reasoning,
      references,
      tokensUsed,
    };
  }

  /**
   * Generate answer from multiple doc sources
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

    if (allResults.length === 0) {
      return {
        answer:
          "I couldn't find relevant information across the requested documentation sources.",
        references: [],
        tokensUsed: 0,
      };
    }

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

    const prompt = `${persona} ${historyContext}Your teammate asked a question that spans multiple documentation sources:

**Question:** "${query}"

**Context:**

- You have access to information from: ${sources.join(", ")}
- Synthesize information across sources when relevant
- Clearly indicate which source each piece of information comes from
${style}

IMPORTANT: ALWAYS respond in the same language as the user's question. If the user asks in Indonesian, respond in Indonesian. If in English, respond in English.

**Official Documentation (Multiple Sources):**

${context}

Give your answer now. Cite source URLs and indicate which framework/library each part refers to.

Response:
`;

    const result = await this.client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });
    const responseText = result.text;

    if (!responseText) {
      throw new Error("No response text generated");
    }

    const references = topResults.slice(0, 5).map((result) => ({
      title: `${result.title} (${result.source})`,
      url: result.url,
      snippet: result.content.substring(0, 150) + "...",
    }));

    const tokensUsed = Math.ceil((prompt.length + responseText.length) / 4);

    return {
      answer: responseText,
      references,
      tokensUsed,
    };
  }

  /**
   * Generate streaming answer from multiple doc sources
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

    if (allResults.length === 0) {
      yield "I couldn't find relevant information across the requested documentation sources.";
      return;
    }

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

    const prompt = `${persona} ${historyContext}Your teammate asked a question that spans multiple documentation sources:

**Question:** "${query}"

**Context:**

- You have access to information from: ${sources.join(", ")}
- Synthesize information across sources when relevant
- Clearly indicate which source each piece of information comes from
${style}

IMPORTANT: ALWAYS respond in the same language as the user's question. If the user asks in Indonesian, respond in Indonesian. If in English, respond in English.

**Official Documentation (Multiple Sources):**

${context}

Give your answer now. Cite source URLs and indicate which framework/library each part refers to.

Response:
`;

    const result = await this.client.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 4096,
      },
    });

    for await (const chunk of result) {
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  }

  /**
   * Generate streaming answer for general queries (fallback agent)
   */
  async *generateGeneralAnswerStream(
    query: string,
    conversationHistory?: Array<{ role: string; content: string }>,
    responseMode: string = "friendly"
  ): AsyncGenerator<string, void, unknown> {
    const historyContext =
      conversationHistory && conversationHistory.length > 0
        ? `\n**Previous conversation:**\n${conversationHistory
            .slice(-4)
            .map((msg) => `${msg.role}: ${msg.content}`)
            .join("\n")}\n\n`
        : "";

    const { persona, style } = this.getResponseModePersona(responseMode);

    const prompt = `${persona} ${historyContext}The user asked a question that is NOT in the documentation.

**Question:** "${query}"

**Instructions:**
1. Answer the question using your general knowledge.
2. Be helpful and accurate.
3. IMPORTANT: Do NOT include any disclaimer about the topic not being in the documentation. The frontend will handle the warning.
4. Respect the user's language (Indonesian/English).
${style}

IMPORTANT: ALWAYS respond in the same language as the user's question. If the user asks in Indonesian, respond in Indonesian. If in English, respond in English.

Response:
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
      const text = chunk.text;
      if (text) {
        yield text;
      }
    }
  }
}

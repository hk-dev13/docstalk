import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Reformulate query based on conversation history for better retrieval
 * This solves the "context loss" problem where follow-up questions fail vector search
 */
export async function reformulateQuery(
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
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1, // Low temp for consistent reformulation
        maxOutputTokens: 100,
      },
    });

    const historyContext = conversationHistory
      .slice(-3) // Use last 3 messages for context
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join('\n');

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
    console.error('Query reformulation failed, using original:', error);
    return query; // Fallback to original on error
  }
}

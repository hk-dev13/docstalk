import { GoogleGenAI } from "@google/genai";

/**
 * Generate embedding for text using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  try {
    const result = await client.models.embedContent({
      model: "text-embedding-004",
      contents: text,
    });
    if (!result.embeddings?.[0]?.values) {
      throw new Error("Failed to generate embedding");
    }
    return result.embeddings[0].values;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

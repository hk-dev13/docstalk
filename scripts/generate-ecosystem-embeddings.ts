#!/usr/bin/env tsx
/**
 * Generate Embeddings for Doc Ecosystems
 *
 * Purpose: Generate vector embeddings for ecosystem descriptions
 *          to enable semantic similarity matching
 *
 * Provider: Google Gemini (text-embedding-004)
 * Dimensions: 1536 (configurable to 768)
 * Batch Size: 16
 *
 * Usage: pnpm tsx scripts/generate-ecosystem-embeddings.ts
 */

import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Embedding model config
  model: "text-embedding-004", // Gemini embedding model
  dimensions: 768, // Gemini default (not 1536!)

  // Batch processing
  batchSize: 16,
  maxRetries: 3,
  retryDelayBase: 1000, // ms

  // Rate limiting
  requestsPerMinute: 1500, // Gemini limit
  throttleDelay: 40, // ms between requests

  // Timeouts
  timeout: 30000, // 30s
};

// ============================================================================
// Types
// ============================================================================

interface Ecosystem {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  aliases: string[];
}

interface EmbeddingResult {
  id: string;
  embedding: number[];
  success: boolean;
  error?: string;
}

// ============================================================================
// Utilities
// ============================================================================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries: number = CONFIG.maxRetries
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;

      const delay = CONFIG.retryDelayBase * Math.pow(2, i);
      console.log(`  ⚠️  Retry ${i + 1}/${retries} after ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error("Max retries exceeded");
}

// ============================================================================
// Main Functions
// ============================================================================

async function fetchEcosystems() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabase
    .from("doc_ecosystems")
    .select("id, name, description, keywords, aliases")
    .order("priority", { ascending: false });

  if (error) throw error;
  return data as Ecosystem[];
}

async function generateEmbedding(
  text: string,
  genAI: GoogleGenAI
): Promise<number[]> {
  return retryWithBackoff(async () => {
    // Use models.embedContent like RAGService does
    const result = await genAI.models.embedContent({
      model: CONFIG.model,
      contents: text,
    });

    // Extract embedding values from response
    if (!result.embeddings?.[0]?.values) {
      throw new Error("No embedding returned");
    }

    return result.embeddings[0].values;
  });
}

async function generateEmbeddings(
  ecosystems: Ecosystem[]
): Promise<EmbeddingResult[]> {
  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  const results: EmbeddingResult[] = [];

  console.log(
    `\n🔮 Generating embeddings for ${ecosystems.length} ecosystems...\n`
  );

  for (let i = 0; i < ecosystems.length; i += CONFIG.batchSize) {
    const batch = ecosystems.slice(i, i + CONFIG.batchSize);
    console.log(
      `📦 Processing batch ${Math.floor(i / CONFIG.batchSize) + 1}...`
    );

    for (const eco of batch) {
      try {
        // Create rich text for embedding
        const embeddingText = [
          eco.description,
          `Keywords: ${eco.keywords.join(", ")}`,
          eco.aliases ? `Common phrases: ${eco.aliases.join(", ")}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

        console.log(`  → ${eco.id}: ${eco.name}`);

        const embedding = await generateEmbedding(embeddingText, genAI);

        results.push({
          id: eco.id,
          embedding,
          success: true,
        });

        console.log(`    ✓ Generated (${embedding.length} dims)`);

        // Throttle to respect rate limits
        await sleep(CONFIG.throttleDelay);
      } catch (error) {
        console.error(
          `    ✗ Failed: ${error instanceof Error ? error.message : error}`
        );
        results.push({
          id: eco.id,
          embedding: [],
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  return results;
}

async function saveEmbeddings(results: EmbeddingResult[]) {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log(`\n💾 Saving embeddings to database...\n`);

  let saved = 0;
  let failed = 0;

  for (const result of results) {
    if (!result.success) {
      failed++;
      continue;
    }

    const { error } = await supabase
      .from("doc_ecosystems")
      .update({ description_embedding: result.embedding })
      .eq("id", result.id);

    if (error) {
      console.error(`  ✗ ${result.id}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${result.id}: Saved`);
      saved++;
    }
  }

  return { saved, failed };
}

async function verifyEmbeddings() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  console.log(`\n🔍 Verifying embeddings...\n`);

  const { data, error } = await supabase
    .from("doc_ecosystems")
    .select("id, name, description_embedding")
    .not("description_embedding", "is", null);

  if (error) throw error;

  console.log(`✅ ${data.length} ecosystems have embeddings`);

  // Verify dimensions
  for (const eco of data) {
    const dims = eco.description_embedding?.length || 0;
    const status = dims === CONFIG.dimensions ? "✓" : "✗";
    console.log(`  ${status} ${eco.id}: ${dims} dimensions`);
  }

  return data.length;
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Ecosystem Embeddings Generator v1.0                    ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log("");
  console.log("📋 Configuration:");
  console.log(`  Model: ${CONFIG.model}`);
  console.log(`  Dimensions: ${CONFIG.dimensions}`);
  console.log(`  Batch size: ${CONFIG.batchSize}`);
  console.log(`  Max retries: ${CONFIG.maxRetries}`);
  console.log("");

  const startTime = Date.now();

  try {
    // 1. Fetch ecosystems
    const ecosystems = await fetchEcosystems();
    console.log(`✅ Fetched ${ecosystems.length} ecosystems from database\n`);

    // 2. Generate embeddings
    const results = await generateEmbeddings(ecosystems);

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(`\n📊 Embedding Generation Summary:`);
    console.log(`  ✓ Successful: ${successful}`);
    console.log(`  ✗ Failed: ${failed}`);

    if (failed > 0) {
      console.log(`\n⚠️  Failures:`);
      results
        .filter((r) => !r.success)
        .forEach((r) => console.log(`  - ${r.id}: ${r.error}`));
    }

    // 3. Save to database
    const { saved, failed: saveFailed } = await saveEmbeddings(results);

    console.log(`\n📊 Database Save Summary:`);
    console.log(`  ✓ Saved: ${saved}`);
    console.log(`  ✗ Failed: ${saveFailed}`);

    // 4. Verify
    const verified = await verifyEmbeddings();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(
      `\n╔══════════════════════════════════════════════════════════╗`
    );
    console.log(`║  ✅ COMPLETED in ${duration}s`);
    console.log(
      `║  ${verified}/${ecosystems.length} ecosystems ready for semantic search`
    );
    console.log(`╚══════════════════════════════════════════════════════════╝`);

    if (verified === ecosystems.length) {
      console.log("\n✨ All embeddings generated successfully!");
      console.log("\n📝 Next steps:");
      console.log(
        "  1. ❌ SKIP vector index (only 8 vectors - brute force is faster)"
      );
      console.log("  2. ✅ Implement EcosystemService with semantic matching");
      console.log("  3. ✅ Test with sample queries");
      console.log("");
      process.exit(0);
    } else {
      console.log("\n⚠️  Some embeddings failed. Please review errors above.");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run
if (require.main === module) {
  main();
}

export { generateEmbeddings, saveEmbeddings, verifyEmbeddings };

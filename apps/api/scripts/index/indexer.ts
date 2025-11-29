import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { createClient } from "@supabase/supabase-js";
import fs from "fs/promises";
import path from "path";
import { QdrantService } from "../../src/services/qdrant.service";
import * as crypto from "crypto";

interface DocChunk {
  content: string;
  url: string;
  title: string;
  source: string;
  metadata?: Record<string, any>;
}

// Initialize clients
const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Split text into smaller chunks if it exceeds size limit
 * Google AI has ~36KB limit, but we use 4KB for better RAG precision
 */
function splitOversizedChunk(text: string, maxBytes: number = 4000): string[] {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  // If within limit, return as-is
  if (bytes.length <= maxBytes) {
    return [text];
  }

  // Calculate how many chunks we need
  const numChunks = Math.ceil(bytes.length / maxBytes);
  const chunkSize = Math.ceil(text.length / numChunks);

  const chunks: string[] = [];

  // Try to split at natural boundaries (paragraphs, sentences)
  for (let i = 0; i < numChunks; i++) {
    const start = i * chunkSize;
    let end = Math.min((i + 1) * chunkSize, text.length);

    // If not the last chunk, try to find a good break point
    if (i < numChunks - 1) {
      // Look for paragraph break first
      const paragraphBreak = text.lastIndexOf("\n\n", end);
      if (paragraphBreak > start && end - paragraphBreak < chunkSize * 0.3) {
        end = paragraphBreak;
      } else {
        // Look for sentence break
        const sentenceBreak = text.lastIndexOf(". ", end);
        if (sentenceBreak > start && end - sentenceBreak < chunkSize * 0.3) {
          end = sentenceBreak + 1;
        }
      }
    }

    chunks.push(text.substring(start, end).trim());
  }

  return chunks;
}

/**
 * Generate embedding for text using Gemini
 */
async function generateEmbedding(text: string): Promise<number[]> {
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

/**
 * Index chunks into Supabase with embeddings
 */
async function indexChunks(source: string, chunks: DocChunk[]) {
  console.log(`\n📊 Indexing ${chunks.length} chunks for ${source}...\n`);

  // Initialize Qdrant
  const qdrant = new QdrantService();
  await qdrant.ensureCollection();

  // Clean up old chunks for this source
  console.log(`  🧹 Cleaning up old chunks for ${source}...`);
  try {
    // 1. Delete from Qdrant
    await qdrant.deleteBySource(source);

    // 2. Delete from Supabase (metadata)
    const { error } = await supabase
      .from("doc_chunk_meta")
      .delete()
      .eq("source", source);

    if (error) throw error;
  } catch (error) {
    console.error(`  ❌ Error deleting old chunks:`, error);
    // Continue anyway, upsert will handle it
  }

  let successCount = 0;
  let errorCount = 0;
  let splitCount = 0;

  // Process in batches to avoid rate limits
  const batchSize = 5;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    const batchPromises = batch.map(async (chunk, idx) => {
      try {
        const globalIdx = i + idx + 1;
        console.log(`  [${globalIdx}/${chunks.length}] Processing chunk...`);

        // Check if chunk needs to be split
        const subChunks = splitOversizedChunk(chunk.content);

        if (subChunks.length > 1) {
          console.log(
            `    📦 Auto-splitting into ${subChunks.length} parts (${(
              new TextEncoder().encode(chunk.content).length / 1024
            ).toFixed(1)}KB total)`
          );
          splitCount++;
        }

        // Process each sub-chunk
        for (let subIdx = 0; subIdx < subChunks.length; subIdx++) {
          const subContent = subChunks[subIdx];

          if (subIdx > 0) {
            console.log(
              `    [${globalIdx}.${subIdx + 1}/${
                subChunks.length
              }] Generating embedding for part ${subIdx + 1}...`
            );
          } else {
            console.log(`    Generating embedding...`);
          }

          // Generate embedding
          const embedding = await generateEmbedding(subContent);

          // Extract metadata fields
          const chunkIndex = chunk.metadata?.chunkIndex || 0;

          // Create title with part indicator if split
          const title =
            subChunks.length > 1
              ? `${chunk.title} (Part ${subIdx + 1}/${subChunks.length})`
              : chunk.title;

          // Generate UUID for the chunk
          const chunkId = crypto.randomUUID();

          // 1. Upsert to Qdrant (Vector + Content)
          await qdrant.upsertPoints([
            {
              id: chunkId,
              vector: embedding,
              payload: {
                source: chunk.source,
                url: chunk.url,
                title: title,
                content: subContent,
                chunk_index: chunkIndex,
                ...chunk.metadata,
                splitPart: subChunks.length > 1 ? subIdx + 1 : undefined,
                totalParts: subChunks.length > 1 ? subChunks.length : undefined,
              },
            },
          ]);

          // 2. Insert to Supabase (Metadata only)
          let retries = 3;
          while (retries > 0) {
            try {
              const { error } = await supabase.from("doc_chunk_meta").insert({
                id: chunkId,
                qdrant_id: chunkId,
                url: chunk.url,
                title: title,
                source: chunk.source,
                chunk_index: chunkIndex,
              });

              if (error) throw error;

              console.log(
                `    ✅ Indexed chunk ${globalIdx}${
                  subIdx > 0 ? `.${subIdx + 1}` : ""
                }`
              );
              successCount++;
              break; // Success
            } catch (err: any) {
              retries--;
              if (retries === 0) {
                console.error(
                  `    ❌ Error inserting metadata ${globalIdx}:`,
                  err.message || err
                );
                errorCount++;
              } else {
                await new Promise((resolve) => setTimeout(resolve, 2000));
              }
            }
          }
        }
      } catch (error) {
        console.error(`  ❌ Error processing chunk:`, error);
        errorCount++;
      }
    });

    await Promise.all(batchPromises);

    // Rate limiting
    if (i + batchSize < chunks.length) {
      console.log(`  ⏳ Waiting 2s to avoid rate limits...\n`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n✅ Indexing complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  if (splitCount > 0) {
    console.log(`   🔄 Auto-split: ${splitCount} oversized chunks`);
  }

  // Update doc_sources metadata
  await supabase
    .from("doc_sources")
    .update({
      total_chunks: successCount,
      last_scraped: new Date().toISOString(),
    })
    .eq("id", source);
}

/**
 * Load chunks from JSON file
 */
async function loadChunks(source: string): Promise<DocChunk[]> {
  const dataDir = path.join(process.cwd(), "data");
  const filePath = path.join(dataDir, `${source}-chunks.json`);

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error(`❌ Error loading chunks from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Main indexing function
 */
async function main() {
  const source = process.argv[2];

  if (!source) {
    console.error("Usage: pnpm index <source>");
    console.error("Example: pnpm index nextjs");
    process.exit(1);
  }

  // Verify Supabase connection
  const { error: connectionError } = await supabase
    .from("doc_sources")
    .select("id")
    .limit(1);

  if (connectionError) {
    console.error("❌ Failed to connect to Supabase:", connectionError.message);
    console.error("\nMake sure you have:");
    console.error("1. Created Supabase project");
    console.error("2. Run the schema SQL (supabase-schema.sql)");
    console.error("3. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
    process.exit(1);
  }

  console.log(`\n🚀 DocsTalk Documentation Indexer\n`);

  // Load chunks
  const chunks = await loadChunks(source);
  console.log(`📂 Loaded ${chunks.length} chunks for ${source}`);

  // Index chunks
  await indexChunks(source, chunks);

  console.log(`\n✅ Done! ${source} is now searchable.\n`);
}

main().catch(console.error);

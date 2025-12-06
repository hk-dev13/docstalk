import "dotenv/config";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";
import TurndownService from "turndown";
import fs from "fs/promises";
import path from "path";

interface DocChunk {
  content: string;
  url: string;
  title: string;
  source: string;
  metadata?: Record<string, any>;
}

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

// Configuration for different documentation sources
const DOC_CONFIGS = {
  nextjs: {
    name: "Next.js",
    baseUrl: "https://nextjs.org",
    startUrls: ["https://nextjs.org/docs", "https://nextjs.org/blog"],
    urlPattern: /^https:\/\/nextjs\.org\/(docs|blog)/,
    maxPages: 500,
  },
  react: {
    name: "React",
    baseUrl: "https://react.dev",
    startUrls: [
      "https://react.dev/learn",
      "https://react.dev/reference",
      "https://react.dev/blog",
    ],
    urlPattern: /^https:\/\/react\.dev\/(learn|reference|blog)/,
    maxPages: 500,
  },
  typescript: {
    name: "TypeScript",
    baseUrl: "https://www.typescriptlang.org",
    startUrls: [
      "https://www.typescriptlang.org/docs/handbook",
      "https://www.typescriptlang.org/docs/handbook/release-notes/overview.html",
    ],
    urlPattern: /^https:\/\/www\.typescriptlang\.org\/docs/,
    maxPages: 500,
  },
  nodejs: {
    name: "Node.js",
    baseUrl: "https://nodejs.org",
    startUrls: [
      "https://nodejs.org/docs/latest/api/",
      "https://nodejs.org/en/blog/release/",
    ],
    urlPattern: /^https:\/\/nodejs\.org\/(docs\/latest\/api|en\/blog\/release)/,
    maxPages: 500,
  },
  tailwind: {
    name: "Tailwind CSS",
    baseUrl: "https://tailwindcss.com",
    startUrls: ["https://tailwindcss.com/docs", "https://tailwindcss.com/blog"],
    urlPattern: /^https:\/\/tailwindcss\.com\/(docs|blog)/,
    maxPages: 500,
  },
  prisma: {
    name: "Prisma",
    baseUrl: "https://www.prisma.io",
    startUrls: ["https://www.prisma.io/docs", "https://www.prisma.io/blog"],
    urlPattern: /^https:\/\/www\.prisma\.io\/(docs|blog)/,
    maxPages: 500,
  },
  express: {
    name: "Express",
    baseUrl: "https://expressjs.com",
    startUrls: ["https://expressjs.com/en/starter/installing.html"],
    urlPattern: /^https:\/\/expressjs\.com\/en/,
    maxPages: 500,
  },
  python: {
    name: "Python",
    baseUrl: "https://docs.python.org/3/",
    startUrls: [
      "https://docs.python.org/3/tutorial/index.html",
      "https://docs.python.org/3/whatsnew/index.html",
    ],
    urlPattern: /^https:\/\/docs\.python\.org\/3\/(tutorial|whatsnew|library)/,
    maxPages: 500,
  },
  rust: {
    name: "Rust",
    baseUrl: "https://doc.rust-lang.org",
    startUrls: [
      "https://doc.rust-lang.org/book/",
      "https://doc.rust-lang.org/edition-guide/",
    ],
    urlPattern: /^https:\/\/doc\.rust-lang\.org\/(book|edition-guide)/,
    maxPages: 500,
  },
  go: {
    name: "Go",
    baseUrl: "https://go.dev",
    startUrls: ["https://go.dev/doc/", "https://go.dev/doc/devel/release"],
    urlPattern: /^https:\/\/go\.dev\/doc/,
    maxPages: 500,
  },
  docker: {
    name: "Docker",
    baseUrl: "https://docs.docker.com",
    startUrls: [
      "https://docs.docker.com/get-started/",
      "https://docs.docker.com/guides/",
      "https://docs.docker.com/reference/",
      "https://docs.docker.com/engine/release-notes/",
    ],
    urlPattern:
      /^https:\/\/docs\.docker\.com\/(get-started|guides|reference|engine|compose|build|desktop)/,
    maxPages: 500,
  },
  fastapi: {
    name: "FastAPI",
    baseUrl: "https://fastapi.tiangolo.com",
    startUrls: [
      "https://fastapi.tiangolo.com/tutorial/",
      "https://fastapi.tiangolo.com/advanced/",
      "https://fastapi.tiangolo.com/release-notes/",
    ],
    urlPattern:
      /^https:\/\/fastapi\.tiangolo\.com\/(tutorial|advanced|deployment|reference|release-notes)/,
    maxPages: 500,
  },
  vue: {
    name: "Vue.js",
    baseUrl: "https://vuejs.org",
    startUrls: [
      "https://vuejs.org/guide/introduction.html",
      "https://vuejs.org/api/",
      "https://vuejs.org/about/blog.html",
    ],
    urlPattern: /^https:\/\/vuejs\.org\/(guide|api|about)/,
    maxPages: 500,
  },
  postgresql: {
    name: "PostgreSQL",
    baseUrl: "https://www.postgresql.org/docs/current/",
    startUrls: [
      "https://www.postgresql.org/docs/current/index.html",
      "https://www.postgresql.org/docs/release/",
    ],
    urlPattern: /^https:\/\/www\.postgresql\.org\/docs\/(current|release)/,
    maxPages: 500,
  },
};

/**
 * Extract clean text content from HTML with aggressive navigation filtering
 */
function extractContent(
  html: string,
  url: string
): { title: string; content: string } {
  const $ = cheerio.load(html);

  // Aggressively remove navigation, menus, and UI elements
  $(
    "script, style, nav, header, footer, aside, " +
      ".sidebar, .navigation, .nav, .menu, .breadcrumb, .breadcrumbs, " +
      ".header, .footer, .skip-link, .mobile-nav, " +
      '[role="navigation"], [role="banner"], [role="contentinfo"], ' +
      ".table-of-contents, .toc, .page-nav, " +
      "button, .button, .btn, " +
      ".social-links, .share-buttons, " +
      ".search-box, .search-form, " +
      ".version-selector, .language-selector"
  ).remove();

  // Extract title
  const title =
    $("h1").first().text().trim() || $("title").text().trim() || url;

  // Try to find main content with priority order
  let mainContent = "";
  const contentSelectors = [
    "main article",
    "main",
    "article",
    '[role="main"]',
    ".main-content",
    ".content",
    ".documentation",
    ".docs-content",
    ".markdown-body",
  ];

  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      mainContent = element.html() || "";
      if (mainContent.length > 100) break; // Found substantial content
    }
  }

  // Fallback to body if no main content found
  if (!mainContent) {
    mainContent = $("body").html() || "";
  }

  // Convert to markdown
  const markdown = turndown.turndown(mainContent);

  // Post-process: filter out short low-quality content
  const cleaned = markdown
    .split("\n\n")
    .filter((paragraph) => {
      const text = paragraph.trim();
      // Filter out very short paragraphs (likely nav/menu remnants)
      if (text.length < 20) return false;
      // Filter out paragraphs that are just links
      if (text.match(/^\[.*\]\(.*\)$/)) return false;
      // Filter out "Menu" or "Version X.X.X" lines
      if (text.match(/^(Menu|Using|Features|Latest Version|Version)/i))
        return false;
      return true;
    })
    .join("\n\n");

  return { title, content: cleaned };
}

/**
 * Split content into overlapping chunks with smart boundary detection
 * @param content - Full markdown content
 * @param maxLength - Maximum chunk size (default: 1200)
 * @param overlap - Overlap percentage (default: 0.2 = 20%)
 */
function splitIntoChunks(
  content: string,
  maxLength: number = 1200,
  overlap: number = 0.2
): string[] {
  const chunks: string[] = [];
  const overlapLength = Math.floor(maxLength * overlap);

  // Split by double newlines (paragraphs) for better semantic boundaries
  const paragraphs = content.split("\n\n").filter((p) => p.trim().length > 0);

  let currentChunk = "";
  let previousChunkTail = ""; // Keep last N characters for overlap

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const potentialChunk =
      currentChunk + (currentChunk ? "\n\n" : "") + paragraph;

    // Check if adding this paragraph exceeds max length
    if (potentialChunk.length > maxLength && currentChunk) {
      // Save current chunk with meaningful content
      if (currentChunk.length > 100) {
        // Minimum viable chunk size
        chunks.push(currentChunk.trim());

        // Extract tail for overlap (last N chars or last 2 paragraphs)
        const words = currentChunk.split(/\s+/);
        const tailWords = words.slice(-Math.floor(words.length * overlap));
        previousChunkTail = tailWords.join(" ");
      }

      // Start new chunk with overlap from previous
      currentChunk = previousChunkTail
        ? previousChunkTail + "\n\n" + paragraph
        : paragraph;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add final chunk
  if (currentChunk && currentChunk.length > 100) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Alternative: Split into chunks preserving code blocks
 * Use this for documentation with lots of code examples
 */
function splitIntoChunksPreservingCode(
  content: string,
  maxLength: number = 1200,
  overlap: number = 0.2
): string[] {
  const chunks: string[] = [];
  const overlapLength = Math.floor(maxLength * overlap);

  // Split by code blocks and paragraphs
  const sections: string[] = [];
  const codeBlockRegex = /```[\s\S]*?```/g;

  let lastIndex = 0;
  let match;

  // Extract code blocks and text separately
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.substring(lastIndex, match.index).trim();
      if (textBefore) sections.push(textBefore);
    }

    // Add code block as single unit (don't split)
    sections.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const remaining = content.substring(lastIndex).trim();
    if (remaining) sections.push(remaining);
  }

  // Now chunk the sections
  let currentChunk = "";
  let previousTail = "";

  for (const section of sections) {
    const isCodeBlock = section.startsWith("```");
    const potentialLength = currentChunk.length + section.length + 4; // +4 for '\n\n'

    if (potentialLength > maxLength && currentChunk) {
      // Save current chunk
      chunks.push(currentChunk.trim());

      // Create overlap tail
      if (!isCodeBlock) {
        const words = currentChunk.split(/\s+/);
        previousTail = words
          .slice(-Math.floor(words.length * overlap))
          .join(" ");
      }

      // Start new chunk
      currentChunk = previousTail ? previousTail + "\n\n" + section : section;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + section;
    }
  }

  if (currentChunk && currentChunk.length > 100) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Crawl documentation website
 */
async function crawlDocumentation(
  source: keyof typeof DOC_CONFIGS
): Promise<DocChunk[]> {
  const config = DOC_CONFIGS[source];
  const visited = new Set<string>();
  const toVisit = [...config.startUrls];
  const allChunks: DocChunk[] = [];

  console.log(`🕷️  Starting crawl for ${config.name}...`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Set user agent to avoid being blocked
  await page.setUserAgent(
    "Mozilla/5.0 (compatible; DocsTalkBot/1.0; +https://docstalk.ai)"
  );

  while (toVisit.length > 0 && visited.size < config.maxPages) {
    const url = toVisit.shift()!;

    if (visited.has(url) || !config.urlPattern.test(url)) {
      continue;
    }

    try {
      console.log(
        `  📄 Scraping: ${url} (${visited.size + 1}/${config.maxPages})`
      );

      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      visited.add(url);

      // Get page content
      const html = await page.content();
      const { title, content } = extractContent(html, url);

      // Split into chunks with overlap
      const chunks = splitIntoChunksPreservingCode(content);

      // Store chunks with index and full content reference
      chunks.forEach((chunk, index) => {
        allChunks.push({
          content: chunk,
          url,
          title,
          source,
          metadata: {
            section: title,
            chunkIndex: index,
            totalChunks: chunks.length,
            // fullContent removed to save DB space (3GB limit reached)
          },
        });
      });

      // Extract links for further crawling
      const links = await page.$$eval("a[href]", (anchors) =>
        anchors.map((a) => (a as HTMLAnchorElement).href)
      );

      for (const link of links) {
        const fullUrl = new URL(link, config.baseUrl).href;
        if (
          config.urlPattern.test(fullUrl) &&
          !visited.has(fullUrl) &&
          !toVisit.includes(fullUrl)
        ) {
          toVisit.push(fullUrl);
        }
      }

      // Be nice to the server
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`  ❌ Error scraping ${url}:`, error);
    }
  }

  await browser.close();

  console.log(
    `✅ Scraped ${visited.size} pages, generated ${allChunks.length} chunks`
  );

  return allChunks;
}

/**
 * Save chunks to JSON file
 */
async function saveChunks(source: string, chunks: DocChunk[]) {
  const outputDir = path.join(process.cwd(), "data");
  await fs.mkdir(outputDir, { recursive: true });

  const outputFile = path.join(outputDir, `${source}-chunks.json`);
  await fs.writeFile(outputFile, JSON.stringify(chunks, null, 2));

  console.log(`💾 Saved ${chunks.length} chunks to ${outputFile}`);
}

/**
 * Main scraper function
 */
async function main() {
  const args = process.argv.slice(2);
  const input = args[0];

  // Parse flags
  const flags = {
    incremental: args.includes("--incremental"),
    partial: args.includes("--partial"),
  };

  if (!input) {
    console.error(
      "Usage: pnpm scrape <source_or_url> [--incremental] [--partial]"
    );
    console.error(`Available sources: ${Object.keys(DOC_CONFIGS).join(", ")}`);
    console.error("");
    console.error("Flags:");
    console.error(
      "  --incremental  Only scrape new/changed pages (compares with existing data)"
    );
    console.error(
      "  --partial      Scrape specific URL(s) only and merge with existing chunks"
    );
    console.error("");
    console.error("Examples:");
    console.error("  pnpm scrape react");
    console.error("  pnpm scrape react --incremental");
    console.error("  pnpm scrape https://react.dev/hooks/useState --partial");
    process.exit(1);
  }

  // Check if input is a URL (partial mode)
  if (input.startsWith("http")) {
    const matchedKey = Object.keys(DOC_CONFIGS).find(
      (key) =>
        DOC_CONFIGS[key as keyof typeof DOC_CONFIGS].urlPattern.test(input) ||
        input.startsWith(DOC_CONFIGS[key as keyof typeof DOC_CONFIGS].baseUrl)
    );

    if (matchedKey) {
      const source = matchedKey as keyof typeof DOC_CONFIGS;
      console.log(`\n🚀 Detected source: ${DOC_CONFIGS[source].name}`);
      console.log(`🎯 Partial scrape: ${input}`);

      if (flags.incremental) {
        console.log(`⚡ Incremental mode: Will check if content changed\n`);
      } else {
        console.log(`📝 Partial mode: Will merge with existing chunks\n`);
      }

      // Override config for single page scrape
      DOC_CONFIGS[source].startUrls = [input];
      DOC_CONFIGS[source].maxPages = 1;

      const chunks = await crawlDocumentation(source);

      // Append to existing chunks instead of overwriting?
      // The saveChunks function currently overwrites.
      // For a single page addition, we probably want to append or merge.
      // But for simplicity and safety, let's just save it as a separate file or handle merging?
      // The user said "add a page". Overwriting the whole nextjs-chunks.json with 1 page would be bad.
      // Let's modify saveChunks to support merging if it's a single page scrape?
      // Or better: just save to the same file but read it first.

      const outputDir = path.join(process.cwd(), "data");
      const outputFile = path.join(outputDir, `${source}-chunks.json`);

      let existingChunks: DocChunk[] = [];
      try {
        const data = await fs.readFile(outputFile, "utf-8");
        existingChunks = JSON.parse(data);
      } catch (e) {
        // File might not exist, that's fine
      }

      // Incremental mode: Check if content changed
      if (flags.incremental && existingChunks.length > 0) {
        const existingForUrl = existingChunks.filter((c) => c.url === input);

        if (existingForUrl.length > 0) {
          // Compare content
          const newContent = chunks.map((c) => c.content).join("\n");
          const oldContent = existingForUrl.map((c) => c.content).join("\n");

          if (newContent === oldContent) {
            console.log(`✅ No changes detected for ${input}`);
            console.log(`   Skipping update (content identical)\n`);
            return;
          } else {
            console.log(`🔄 Changes detected for ${input}`);
            console.log(`   Updating chunks...\n`);
          }
        }
      }

      // Filter out existing chunks for this URL to avoid duplicates
      const filteredChunks = existingChunks.filter((c) => c.url !== input);
      const newChunks = [...filteredChunks, ...chunks];

      await fs.writeFile(outputFile, JSON.stringify(newChunks, null, 2));
      console.log(`💾 Merged ${chunks.length} new chunks into ${outputFile}`);
      console.log(`   Total chunks: ${newChunks.length}`);

      console.log(
        `\n✅ Done! Don't forget to re-index: pnpm index ${source}\n`
      );
      return;
    } else {
      console.error(
        "❌ Error: URL does not match any configured documentation source."
      );
      process.exit(1);
    }
  }

  // Original logic for full scrape
  const source = input as keyof typeof DOC_CONFIGS;

  if (!DOC_CONFIGS[source]) {
    console.error("Usage: pnpm scrape <source>");
    console.error(`Available sources: ${Object.keys(DOC_CONFIGS).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🚀 DocsTalk Documentation Scraper\n`);

  if (flags.incremental) {
    console.log(`⚡ Incremental mode: Will compare with existing data\n`);
  }

  const chunks = await crawlDocumentation(source);

  // Incremental mode: Merge with existing chunks
  if (flags.incremental) {
    const outputDir = path.join(process.cwd(), "data");
    const outputFile = path.join(outputDir, `${source}-chunks.json`);

    let existingChunks: DocChunk[] = [];
    try {
      const data = await fs.readFile(outputFile, "utf-8");
      existingChunks = JSON.parse(data);
    } catch (e) {
      console.log(`  No existing data found, will create new file\n`);
    }

    if (existingChunks.length > 0) {
      console.log(
        `  📊 Comparing with ${existingChunks.length} existing chunks...`
      );

      // Group by URL for comparison
      const existingByUrl = new Map<string, DocChunk[]>();
      existingChunks.forEach((chunk) => {
        const urlChunks = existingByUrl.get(chunk.url) || [];
        urlChunks.push(chunk);
        existingByUrl.set(chunk.url, urlChunks);
      });

      const newByUrl = new Map<string, DocChunk[]>();
      chunks.forEach((chunk) => {
        const urlChunks = newByUrl.get(chunk.url) || [];
        urlChunks.push(chunk);
        newByUrl.set(chunk.url, urlChunks);
      });

      // Merge strategy:
      // 1. Keep existing chunks for URLs not in new crawl (unchanged pages)
      // 2. Replace chunks for URLs that were re-scraped
      const mergedChunks: DocChunk[] = [];
      let unchangedCount = 0;
      let changedCount = 0;
      let newCount = 0;

      // Add all new/changed chunks
      chunks.forEach((chunk) => {
        mergedChunks.push(chunk);
        if (existingByUrl.has(chunk.url)) {
          changedCount++;
        } else {
          newCount++;
        }
      });

      // Add unchanged existing chunks (not in new crawl)
      existingChunks.forEach((chunk) => {
        if (!newByUrl.has(chunk.url)) {
          mergedChunks.push(chunk);
          unchangedCount++;
        }
      });

      console.log(`  ✅ Merge complete:`);
      console.log(`     New pages: ${newCount}`);
      console.log(`     Changed pages: ${changedCount}`);
      console.log(`     Unchanged pages: ${unchangedCount}`);
      console.log(`     Total chunks: ${mergedChunks.length}\n`);

      await saveChunks(source, mergedChunks);
    } else {
      await saveChunks(source, chunks);
    }
  } else {
    await saveChunks(source, chunks);
  }

  console.log(`\n✅ Done! Next step: pnpm index ${source}\n`);
}

main().catch(console.error);

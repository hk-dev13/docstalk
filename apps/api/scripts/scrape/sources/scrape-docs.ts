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
    startUrls: ["https://nextjs.org/docs"],
    urlPattern: /^https:\/\/nextjs\.org\/docs/,
    maxPages: 200, // Free tier friendly
  },
  react: {
    name: "React",
    baseUrl: "https://react.dev",
    startUrls: ["https://react.dev/learn", "https://react.dev/reference"],
    urlPattern: /^https:\/\/react\.dev\/(learn|reference)/,
    maxPages: 200,
  },
  typescript: {
    name: "TypeScript",
    baseUrl: "https://www.typescriptlang.org",
    startUrls: ["https://www.typescriptlang.org/docs/handbook"],
    urlPattern: /^https:\/\/www\.typescriptlang\.org\/docs/,
    maxPages: 200,
  },
  nodejs: {
    name: "Node.js",
    baseUrl: "https://nodejs.org",
    startUrls: ["https://nodejs.org/docs/latest/api/"],
    urlPattern: /^https:\/\/nodejs\.org\/docs\/latest\/api/,
    maxPages: 200,
  },
  tailwind: {
    name: "Tailwind CSS",
    baseUrl: "https://tailwindcss.com",
    startUrls: ["https://tailwindcss.com/docs"],
    urlPattern: /^https:\/\/tailwindcss\.com\/docs/,
    maxPages: 200,
  },
  prisma: {
    name: "Prisma",
    baseUrl: "https://www.prisma.io",
    startUrls: ["https://www.prisma.io/docs"],
    urlPattern: /^https:\/\/www\.prisma\.io\/docs/,
    maxPages: 200,
  },
  express: {
    name: "Express",
    baseUrl: "https://expressjs.com",
    startUrls: ["https://expressjs.com/en/starter/installing.html"],
    urlPattern: /^https:\/\/expressjs\.com\/en/,
    maxPages: 100,
  },
  python: {
    name: "Python",
    baseUrl: "https://docs.python.org/3/",
    startUrls: ["https://docs.python.org/3/tutorial/index.html"],
    urlPattern: /^https:\/\/docs\.python\.org\/3/,
    maxPages: 200,
  },
  rust: {
    name: "Rust",
    baseUrl: "https://doc.rust-lang.org",
    startUrls: ["https://doc.rust-lang.org/book/"],
    urlPattern: /^https:\/\/doc\.rust-lang\.org\/book/,
    maxPages: 200,
  },
  go: {
    name: "Go",
    baseUrl: "https://go.dev",
    startUrls: ["https://go.dev/doc/"],
    urlPattern: /^https:\/\/go\.dev\/doc/,
    maxPages: 200,
  },
  docker: {
    name: "Docker",
    baseUrl: "https://docs.docker.com",
    startUrls: [
      "https://docs.docker.com/get-started/",
      "https://docs.docker.com/guides/",
      "https://docs.docker.com/reference/",
    ],
    urlPattern: /^https:\/\/docs\.docker\.com\/(get-started|guides|reference|engine|compose|build|desktop)/,
    maxPages: 150,
  },
  fastapi: {
    name: "FastAPI",
    baseUrl: "https://fastapi.tiangolo.com",
    startUrls: [
      "https://fastapi.tiangolo.com/tutorial/",
      "https://fastapi.tiangolo.com/advanced/",
    ],
    urlPattern: /^https:\/\/fastapi\.tiangolo\.com\/(tutorial|advanced|deployment|reference)/,
    maxPages: 150,
  },
  vue: {
    name: "Vue.js",
    baseUrl: "https://vuejs.org",
    startUrls: [
      "https://vuejs.org/guide/introduction.html",
      "https://vuejs.org/api/",
    ],
    urlPattern: /^https:\/\/vuejs\.org\/(guide|api)/,
    maxPages: 150,
  },
  postgresql: {
    name: "PostgreSQL",
    baseUrl: "https://www.postgresql.org/docs/current/",
    startUrls: [
      "https://www.postgresql.org/docs/current/tutorial.html",
      "https://www.postgresql.org/docs/current/sql.html",
    ],
    urlPattern: /^https:\/\/www\.postgresql\.org\/docs\/current/,
    maxPages: 150,
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
  const input = process.argv[2];

  if (!input) {
    console.error("Usage: pnpm scrape <source_or_url>");
    console.error(`Available sources: ${Object.keys(DOC_CONFIGS).join(", ")}`);
    console.error("Or provide a specific URL to scrape a single page.");
    process.exit(1);
  }

  // Check if input is a URL
  if (input.startsWith("http")) {
    const matchedKey = Object.keys(DOC_CONFIGS).find(
      (key) =>
        DOC_CONFIGS[key as keyof typeof DOC_CONFIGS].urlPattern.test(input) ||
        input.startsWith(DOC_CONFIGS[key as keyof typeof DOC_CONFIGS].baseUrl)
    );

    if (matchedKey) {
      const source = matchedKey as keyof typeof DOC_CONFIGS;
      console.log(`\n🚀 Detected source: ${DOC_CONFIGS[source].name}`);
      console.log(`🎯 Scraping single page: ${input}\n`);

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

  const chunks = await crawlDocumentation(source);
  await saveChunks(source, chunks);

  console.log(`\n✅ Done! Next step: pnpm index ${source}\n`);
}

main().catch(console.error);

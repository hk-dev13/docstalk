import 'dotenv/config';
import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import fs from 'fs/promises';
import path from 'path';

interface DocChunk {
  content: string;
  url: string;
  title: string;
  source: string;
  metadata?: Record<string, any>;
}

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

// Configuration for different documentation sources
const DOC_CONFIGS = {
  nextjs: {
    name: 'Next.js',
    baseUrl: 'https://nextjs.org',
    startUrls: [
      'https://nextjs.org/docs',
    ],
    urlPattern: /^https:\/\/nextjs\.org\/docs/,
    maxPages: 200, // Free tier friendly
  },
  react: {
    name: 'React',
    baseUrl: 'https://react.dev',
    startUrls: [
      'https://react.dev/learn',
      'https://react.dev/reference',
    ],
    urlPattern: /^https:\/\/react\.dev\/(learn|reference)/,
    maxPages: 150,
  },
  typescript: {
    name: 'TypeScript',
    baseUrl: 'https://www.typescriptlang.org',
    startUrls: [
      'https://www.typescriptlang.org/docs/handbook',
    ],
    urlPattern: /^https:\/\/www\.typescriptlang\.org\/docs/,
    maxPages: 100,
  },
};

/**
 * Extract clean text content from HTML with aggressive navigation filtering
 */
function extractContent(html: string, url: string): { title: string; content: string } {
  const $ = cheerio.load(html);
  
  // Aggressively remove navigation, menus, and UI elements
  $(
    'script, style, nav, header, footer, aside, ' +
    '.sidebar, .navigation, .nav, .menu, .breadcrumb, .breadcrumbs, ' +
    '.header, .footer, .skip-link, .mobile-nav, ' +
    '[role="navigation"], [role="banner"], [role="contentinfo"], ' +
    '.table-of-contents, .toc, .page-nav, ' +
    'button, .button, .btn, ' +
    '.social-links, .share-buttons, ' +
    '.search-box, .search-form, ' +
    '.version-selector, .language-selector'
  ).remove();
  
  // Extract title
  const title = $('h1').first().text().trim() || $('title').text().trim() || url;
  
  // Try to find main content with priority order
  let mainContent = '';
  const contentSelectors = [
    'main article',
    'main',
    'article',
    '[role="main"]',
    '.main-content',
    '.content',
    '.documentation',
    '.docs-content',
    '.markdown-body',
  ];
  
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      mainContent = element.html() || '';
      if (mainContent.length > 100) break; // Found substantial content
    }
  }
  
  // Fallback to body if no main content found
  if (!mainContent) {
    mainContent = $('body').html() || '';
  }
  
  // Convert to markdown
  const markdown = turndown.turndown(mainContent);
  
  // Post-process: filter out short low-quality content
  const cleaned = markdown
    .split('\n\n')
    .filter(paragraph => {
      const text = paragraph.trim();
      // Filter out very short paragraphs (likely nav/menu remnants)
      if (text.length < 20) return false;
      // Filter out paragraphs that are just links
      if (text.match(/^\[.*\]\(.*\)$/)) return false;
      // Filter out "Menu" or "Version X.X.X" lines
      if (text.match(/^(Menu|Using|Features|Latest Version|Version)/i)) return false;
      return true;
    })
    .join('\n\n');
  
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
  const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let previousChunkTail = ''; // Keep last N characters for overlap
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const potentialChunk = currentChunk + (currentChunk ? '\n\n' : '') + paragraph;
    
    // Check if adding this paragraph exceeds max length
    if (potentialChunk.length > maxLength && currentChunk) {
      // Save current chunk with meaningful content
      if (currentChunk.length > 100) { // Minimum viable chunk size
        chunks.push(currentChunk.trim());
        
        // Extract tail for overlap (last N chars or last 2 paragraphs)
        const words = currentChunk.split(/\s+/);
        const tailWords = words.slice(-Math.floor(words.length * overlap));
        previousChunkTail = tailWords.join(' ');
      }
      
      // Start new chunk with overlap from previous
      currentChunk = previousChunkTail 
        ? previousChunkTail + '\n\n' + paragraph 
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
  let currentChunk = '';
  let previousTail = '';
  
  for (const section of sections) {
    const isCodeBlock = section.startsWith('```');
    const potentialLength = currentChunk.length + section.length + 4; // +4 for '\n\n'
    
    if (potentialLength > maxLength && currentChunk) {
      // Save current chunk
      chunks.push(currentChunk.trim());
      
      // Create overlap tail
      if (!isCodeBlock) {
        const words = currentChunk.split(/\s+/);
        previousTail = words.slice(-Math.floor(words.length * overlap)).join(' ');
      }
      
      // Start new chunk
      currentChunk = previousTail ? previousTail + '\n\n' + section : section;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + section;
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
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  const page = await browser.newPage();
  
  // Set user agent to avoid being blocked
  await page.setUserAgent(
    'Mozilla/5.0 (compatible; DocsTalkBot/1.0; +https://docstalk.ai)'
  );
  
  while (toVisit.length > 0 && visited.size < config.maxPages) {
    const url = toVisit.shift()!;
    
    if (visited.has(url) || !config.urlPattern.test(url)) {
      continue;
    }
    
    try {
      console.log(`  📄 Scraping: ${url} (${visited.size + 1}/${config.maxPages})`);
      
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
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
            // Store full content only for first chunk to save space
            fullContent: index === 0 ? content : undefined,
          },
        });
      });
      
      // Extract links for further crawling
      const links = await page.$$eval('a[href]', (anchors) =>
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
  
  console.log(`✅ Scraped ${visited.size} pages, generated ${allChunks.length} chunks`);
  
  return allChunks;
}

/**
 * Save chunks to JSON file
 */
async function saveChunks(source: string, chunks: DocChunk[]) {
  const outputDir = path.join(process.cwd(), 'data');
  await fs.mkdir(outputDir, { recursive: true });
  
  const outputFile = path.join(outputDir, `${source}-chunks.json`);
  await fs.writeFile(outputFile, JSON.stringify(chunks, null, 2));
  
  console.log(`💾 Saved ${chunks.length} chunks to ${outputFile}`);
}

/**
 * Main scraper function
 */
async function main() {
  const source = process.argv[2] as keyof typeof DOC_CONFIGS;
  
  if (!source || !DOC_CONFIGS[source]) {
    console.error('Usage: pnpm scrape <source>');
    console.error(`Available sources: ${Object.keys(DOC_CONFIGS).join(', ')}`);
    process.exit(1);
  }
  
  console.log(`\n🚀 DocsTalk Documentation Scraper\n`);
  
  const chunks = await crawlDocumentation(source);
  await saveChunks(source, chunks);
  
  console.log(`\n✅ Done! Next step: pnpm index ${source}\n`);
}

main().catch(console.error);

/**
 * OnlineSearchService - Self-Learning RAG: Online Documentation Search
 *
 * Searches official documentation online when Qdrant has no relevant results.
 * Uses Google Custom Search API with domain whitelist (conservative scope).
 */

import * as cheerio from "cheerio";
import TurndownService from "turndown";
import crypto from "crypto";

// Types
export interface OnlineSearchResult {
  url: string;
  title: string;
  snippet: string;
  source: string;
  score: number;
}

interface RawGoogleResult {
  link: string;
  title: string;
  snippet: string;
}

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  source: string;
  contentHash: string;
}

export class OnlineSearchService {
  private turndown: TurndownService;

  // Domain whitelist (conservative scope - only domains we support)
  private ALLOWED_DOMAINS: Record<string, string> = {
    // Frontend
    "nextjs.org": "nextjs",
    "react.dev": "react",
    "vuejs.org": "vue",
    "angular.dev": "angular",
    "angular.io": "angular",
    "svelte.dev": "svelte",
    "tailwindcss.com": "tailwind",

    // Backend/Runtime
    "nodejs.org": "nodejs",
    "expressjs.com": "express",
    "fastapi.tiangolo.com": "fastapi",
    "go.dev": "go",
    "doc.rust-lang.org": "rust",
    "www.rust-lang.org": "rust",
    "docs.python.org": "python",

    // Database/ORM
    "prisma.io": "prisma",
    "www.prisma.io": "prisma",
    "www.postgresql.org": "postgresql",
    "www.mongodb.com": "mongodb",
    "docs.mongodb.com": "mongodb",
    "redis.io": "redis",

    // DevOps/Cloud
    "docs.docker.com": "docker",
    "kubernetes.io": "kubernetes",

    // Cloud Providers
    "cloud.google.com": "gcp",
    "firebase.google.com": "firebase",
    "docs.aws.amazon.com": "aws",
    "learn.microsoft.com": "azure",
    "docs.microsoft.com": "azure",

    // Languages
    "typescriptlang.org": "typescript",
    "www.typescriptlang.org": "typescript",

    // General Web
    "developer.mozilla.org": "mdn",
  };

  // Google CSE config
  private CSE_API_KEY: string;
  private CSE_ENGINE_ID: string;
  private ENABLED: boolean;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: "atx",
      codeBlockStyle: "fenced",
    });

    this.CSE_API_KEY = process.env.GOOGLE_CSE_API_KEY || "";
    this.CSE_ENGINE_ID = process.env.GOOGLE_CSE_ENGINE_ID || "";
    this.ENABLED = process.env.ONLINE_SEARCH_ENABLED === "true";
  }

  /**
   * Check if online search is enabled
   */
  isEnabled(): boolean {
    return this.ENABLED && !!this.CSE_API_KEY && !!this.CSE_ENGINE_ID;
  }

  /**
   * Check if URL is from allowed domain
   */
  isAllowedDomain(url: string): boolean {
    try {
      const hostname = new URL(url).hostname;
      return Object.keys(this.ALLOWED_DOMAINS).some(
        (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }

  /**
   * Get source ID from URL
   */
  getSourceFromUrl(url: string): string | null {
    try {
      const hostname = new URL(url).hostname;
      for (const [domain, source] of Object.entries(this.ALLOWED_DOMAINS)) {
        if (hostname === domain || hostname.endsWith(`.${domain}`)) {
          return source;
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Build site-restricted search query for Google CSE
   * Restricts search to only allowed documentation domains
   */
  private buildSiteQuery(query: string, ecosystemHint?: string): string {
    // If ecosystem hint provided, prioritize those domains
    if (ecosystemHint) {
      const domainMap: Record<string, string[]> = {
        frontend_web: [
          "nextjs.org",
          "react.dev",
          "vuejs.org",
          "angular.dev",
          "angular.io",
          "svelte.dev",
          "typescriptlang.org",
        ],
        js_backend: ["nodejs.org", "expressjs.com"],
        python: ["fastapi.tiangolo.com", "docs.python.org"],
        systems: ["go.dev", "doc.rust-lang.org", "www.rust-lang.org"],
        database: [
          "prisma.io",
          "www.prisma.io",
          "www.postgresql.org",
          "www.mongodb.com",
          "docs.mongodb.com",
          "redis.io",
        ],
        styling: ["tailwindcss.com"],
        cloud_infra: [
          "docs.docker.com",
          "kubernetes.io",
          "cloud.google.com",
          "firebase.google.com",
          "docs.aws.amazon.com",
          "learn.microsoft.com",
          "docs.microsoft.com",
        ],
      };

      const domains = domainMap[ecosystemHint];
      if (domains && domains.length > 0) {
        const siteRestriction = domains.map((d) => `site:${d}`).join(" OR ");
        return `${query} (${siteRestriction})`;
      }
    }

    // Otherwise, search all allowed domains
    const allDomains = Object.keys(this.ALLOWED_DOMAINS);
    const siteRestriction = allDomains.map((d) => `site:${d}`).join(" OR ");
    return `${query} (${siteRestriction})`;
  }

  /**
   * Search documentation using Google Custom Search API
   */
  async searchDocumentation(
    query: string,
    ecosystemHint?: string,
    limit: number = 5
  ): Promise<OnlineSearchResult[]> {
    if (!this.isEnabled()) {
      console.log("[OnlineSearch] Disabled or missing API key");
      return [];
    }

    try {
      const searchQuery = this.buildSiteQuery(query, ecosystemHint);
      const apiUrl = new URL("https://www.googleapis.com/customsearch/v1");
      apiUrl.searchParams.set("key", this.CSE_API_KEY);
      apiUrl.searchParams.set("cx", this.CSE_ENGINE_ID);
      apiUrl.searchParams.set("q", searchQuery);
      apiUrl.searchParams.set("num", String(Math.min(limit * 2, 10))); // Fetch extra for ranking

      console.log(`[OnlineSearch] Searching: ${query}`);

      const response = await fetch(apiUrl.toString());
      if (!response.ok) {
        console.error(`[OnlineSearch] API error: ${response.status}`);
        return [];
      }

      const data = (await response.json()) as { items?: RawGoogleResult[] };
      const items: RawGoogleResult[] = data.items || [];

      // Filter to only allowed domains and rank results
      const filteredResults = items.filter((item) =>
        this.isAllowedDomain(item.link)
      );

      return this.rankResults(filteredResults, query).slice(0, limit);
    } catch (error) {
      console.error("[OnlineSearch] Search failed:", error);
      return [];
    }
  }

  /**
   * Ranking/Verdict Engine - Score and sort search results
   */
  rankResults(results: RawGoogleResult[], query: string): OnlineSearchResult[] {
    const queryWords = query
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2);

    return results
      .map((r) => {
        let score = 0;
        const url = r.link.toLowerCase();
        const title = r.title.toLowerCase();
        const snippet = r.snippet.toLowerCase();

        // Domain score
        if (url.includes("/docs")) score += 30;
        if (url.includes("/api")) score += 20;
        if (url.includes("/guide")) score += 25;
        if (url.includes("/reference")) score += 20;
        if (url.includes("/blog")) score -= 20;
        if (url.includes("/changelog")) score -= 10;

        // Title relevance
        queryWords.forEach((word) => {
          if (title.includes(word)) score += 20;
        });

        // Snippet relevance
        queryWords.forEach((word) => {
          if (snippet.includes(word)) score += 10;
        });

        // Prefer shorter URLs (usually more authoritative)
        if (r.link.length < 60) score += 10;
        if (r.link.length < 80) score += 5;

        const source = this.getSourceFromUrl(r.link) || "unknown";

        return {
          url: r.link,
          title: r.title,
          snippet: r.snippet,
          source,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Scrape URL content - Cheerio first, Puppeteer fallback
   */
  async scrapeUrl(url: string): Promise<ScrapedContent> {
    console.log(`[OnlineSearch] Scraping: ${url}`);

    // Try Cheerio first (fast, low resource)
    try {
      const content = await this.scrapeWithCheerio(url);
      if (content.content.length > 500) {
        return content;
      }
      console.log(
        `[OnlineSearch] Cheerio returned short content, trying Puppeteer...`
      );
    } catch (error) {
      console.log(`[OnlineSearch] Cheerio failed, trying Puppeteer...`);
    }

    // Fallback to Puppeteer for JS-heavy pages
    return this.scrapeWithPuppeteer(url);
  }

  /**
   * Scrape with Cheerio (fast, for static pages)
   */
  private async scrapeWithCheerio(url: string): Promise<ScrapedContent> {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; DocsTalkBot/1.0; +https://docstalk.envoyou.com)",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove unwanted elements
    $(
      "script, style, nav, header, footer, aside, .sidebar, .navigation, .menu, .ads, .comments"
    ).remove();

    // Get title
    const title =
      $("h1").first().text().trim() || $("title").text().trim() || "Untitled";

    // Get main content
    const mainSelectors = [
      "main",
      "article",
      ".content",
      ".main-content",
      "#content",
      ".docs-content",
      ".markdown-body",
    ];

    let contentHtml = "";
    for (const selector of mainSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        contentHtml = element.html() || "";
        break;
      }
    }

    // Fallback to body
    if (!contentHtml) {
      contentHtml = $("body").html() || "";
    }

    // Convert to markdown
    const content = this.turndown
      .turndown(contentHtml)
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    const source = this.getSourceFromUrl(url) || "unknown";
    const contentHash = this.calculateHash(content);

    return { url, title, content, source, contentHash };
  }

  /**
   * Scrape with Puppeteer (for JS-heavy pages)
   */
  private async scrapeWithPuppeteer(
    url: string,
    retries: number = 3
  ): Promise<ScrapedContent> {
    // Dynamic import to avoid loading Puppeteer if not needed
    const puppeteer = await import("puppeteer");

    for (let attempt = 1; attempt <= retries; attempt++) {
      let browser;
      try {
        browser = await puppeteer.default.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (compatible; DocsTalkBot/1.0; +https://docstalk.envoyou.com)"
        );

        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

        // Wait for content to load
        await page.waitForSelector("body", { timeout: 5000 });

        const html = await page.content();
        await browser.close();

        // Extract with Cheerio
        const $ = cheerio.load(html);
        $(
          "script, style, nav, header, footer, aside, .sidebar, .navigation, .menu"
        ).remove();

        const title =
          $("h1").first().text().trim() ||
          $("title").text().trim() ||
          "Untitled";

        const mainSelectors = ["main", "article", ".content", ".main-content"];
        let contentHtml = "";
        for (const selector of mainSelectors) {
          const element = $(selector);
          if (element.length > 0) {
            contentHtml = element.html() || "";
            break;
          }
        }
        if (!contentHtml) {
          contentHtml = $("body").html() || "";
        }

        const content = this.turndown
          .turndown(contentHtml)
          .replace(/\n{3,}/g, "\n\n")
          .trim();

        const source = this.getSourceFromUrl(url) || "unknown";
        const contentHash = this.calculateHash(content);

        return { url, title, content, source, contentHash };
      } catch (error) {
        if (browser) await browser.close();

        if (attempt === retries) {
          throw new Error(
            `Puppeteer failed after ${retries} attempts: ${error}`
          );
        }

        // Exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        console.log(
          `[OnlineSearch] Puppeteer attempt ${attempt} failed, retrying in ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error("Puppeteer scraping failed");
  }

  /**
   * Calculate SHA-256 hash of content for deduplication
   */
  calculateHash(content: string): string {
    return crypto.createHash("sha256").update(content).digest("hex");
  }
}

// Export singleton
export const onlineSearchService = new OnlineSearchService();

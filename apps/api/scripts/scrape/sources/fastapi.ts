import { DocumentChunk } from "@docstalk/types";
import puppeteer from "puppeteer";
import TurndownService from "turndown";

/**
 * FastAPI Documentation Scraper
 * Base URL: https://fastapi.tiangolo.com
 * Ecosystem: python
 */

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

const BASE_URL = "https://fastapi.tiangolo.com";

const SECTIONS_TO_SCRAPE = [
  "/tutorial/",
  "/tutorial/first-steps/",
  "/tutorial/path-params/",
  "/tutorial/query-params/",
  "/tutorial/body/",
  "/tutorial/dependencies/",
  "/tutorial/security/",
  "/advanced/",
  "/deployment/",
  "/reference/",
];

export async function scrapeFastAPI(): Promise<DocumentChunk[]> {
  console.log("⚡ Starting FastAPI documentation scrape...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const chunks: DocumentChunk[] = [];
  let processedCount = 0;

  try {
    for (const section of SECTIONS_TO_SCRAPE) {
      const url = `${BASE_URL}${section}`;
      console.log(`📄 Scraping: ${url}`);

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      // Extract main content (FastAPI uses .md-content)
      const content = await page.evaluate(() => {
        const main = document.querySelector(".md-content, main, article");
        return main ? main.textContent : "";
      });

      const html = await page.evaluate(() => {
        const main = document.querySelector(".md-content, main, article");
        return main ? main.innerHTML : "";
      });

      if (content && content.trim().length > 100) {
        const markdown = turndownService.turndown(html);

        const title = await page.evaluate(() => {
          return (
            document.querySelector("h1")?.textContent ||
            document.querySelector("title")?.textContent ||
            "FastAPI Documentation"
          );
        });

        chunks.push({
          id: `fastapi-${processedCount}`,
          url: url,
          title: title.trim(),
          content: markdown,
          source: "fastapi",
          metadata: {
            section: section,
            scrapeDate: new Date().toISOString(),
          },
        });

        processedCount++;
      }

      await page.close();

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`✅ FastAPI: Scraped ${chunks.length} pages`);
  } catch (error) {
    console.error("❌ FastAPI scrape error:", error);
  } finally {
    await browser.close();
  }

  return chunks;
}

// For CLI usage
if (require.main === module) {
  scrapeFastAPI().then((chunks) => {
    console.log(`\n📊 Summary:`);
    console.log(`  Total chunks: ${chunks.length}`);
    console.log(`  Run indexer to save to database`);
  });
}

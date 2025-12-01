import { DocumentChunk } from "@docstalk/types";
import puppeteer from "puppeteer";
import TurndownService from "turndown";

/**
 * Docker Documentation Scraper
 * Base URL: https://docs.docker.com
 * Ecosystem: cloud_infra
 */

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

const BASE_URL = "https://docs.docker.com";

const SECTIONS_TO_SCRAPE = [
  "/get-started/",
  "/guides/",
  "/reference/",
  "/engine/",
  "/compose/",
  "/build/",
  "/desktop/",
];

export async function scrapeDocker(): Promise<DocumentChunk[]> {
  console.log("🐳 Starting Docker documentation scrape...");

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

      // Extract main content
      const content = await page.evaluate(() => {
        // Docker uses main article or .content-wrapper
        const main = document.querySelector(
          "main article, .content-wrapper, main"
        );
        return main ? main.textContent : "";
      });

      const html = await page.evaluate(() => {
        const main = document.querySelector(
          "main article, .content-wrapper, main"
        );
        return main ? main.innerHTML : "";
      });

      if (content && content.trim().length > 100) {
        const markdown = turndownService.turndown(html);

        const title = await page.evaluate(() => {
          return (
            document.querySelector("h1")?.textContent ||
            document.querySelector("title")?.textContent ||
            "Docker Documentation"
          );
        });

        chunks.push({
          id: `docker-${processedCount}`,
          url: url,
          title: title.trim(),
          content: markdown,
          source: "docker",
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

    console.log(`✅ Docker: Scraped ${chunks.length} pages`);
  } catch (error) {
    console.error("❌ Docker scrape error:", error);
  } finally {
    await browser.close();
  }

  return chunks;
}

// For CLI usage
if (require.main === module) {
  scrapeDocker().then((chunks) => {
    console.log(`\n📊 Summary:`);
    console.log(`  Total chunks: ${chunks.length}`);
    console.log(`  Run indexer to save to database`);
  });
}

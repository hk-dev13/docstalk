import { DocumentChunk } from "@docstalk/types";
import puppeteer from "puppeteer";
import TurndownService from "turndown";

/**
 * PostgreSQL Documentation Scraper
 * Base URL: https://www.postgresql.org/docs/current/
 * Ecosystem: database
 */

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

const BASE_URL = "https://www.postgresql.org/docs/current/";

const SECTIONS_TO_SCRAPE = [
  "tutorial-start.html",
  "tutorial-sql.html",
  "tutorial-createdb.html",
  "tutorial-table.html",
  "tutorial-populate.html",
  "tutorial-select.html",
  "tutorial-join.html",
  "tutorial-agg.html",
  "datatype.html",
  "functions.html",
  "indexes.html",
  "queries.html",
  "ddl.html",
  "dml.html",
  "performance-tips.html",
];

export async function scrapePostgreSQL(): Promise<DocumentChunk[]> {
  console.log("🐘 Starting PostgreSQL documentation scrape...");

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
        const main = document.querySelector(".sect1, .chapter, main, body");
        // Remove navigation
        const nav = document.querySelectorAll(".navheader, .navfooter");
        nav.forEach((n) => n.remove());
        return main ? main.textContent : "";
      });

      const html = await page.evaluate(() => {
        const main = document.querySelector(".sect1, .chapter, main, body");
        return main ? main.innerHTML : "";
      });

      if (content && content.trim().length > 100) {
        const markdown = turndownService.turndown(html);

        const title = await page.evaluate(() => {
          return (
            document.querySelector("h1, h2, .title")?.textContent ||
            document.querySelector("title")?.textContent ||
            "PostgreSQL Documentation"
          );
        });

        chunks.push({
          id: `postgresql-${processedCount}`,
          url: url,
          title: title.trim(),
          content: markdown,
          source: "postgresql",
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

    console.log(`✅ PostgreSQL: Scraped ${chunks.length} pages`);
  } catch (error) {
    console.error("❌ PostgreSQL scrape error:", error);
  } finally {
    await browser.close();
  }

  return chunks;
}

// For CLI usage
if (require.main === module) {
  scrapePostgreSQL().then((chunks) => {
    console.log(`\n📊 Summary:`);
    console.log(`  Total chunks: ${chunks.length}`);
    console.log(`  Run indexer to save to database`);
  });
}

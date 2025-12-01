import { DocumentChunk } from '@docstalk/types';
import puppeteer from 'puppeteer';
import TurndownService from 'turndown';

/**
 * Vue.js Documentation Scraper
 * Base URL: https://vuejs.org
 * Ecosystem: frontend_web
 */

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
});

const BASE_URL = 'https://vuejs.org';

const SECTIONS_TO_SCRAPE = [
  '/guide/introduction.html',
  '/guide/essentials/application.html',
  '/guide/essentials/template-syntax.html',
  '/guide/essentials/reactivity-fundamentals.html',
  '/guide/essentials/computed.html',
  '/guide/essentials/conditional.html',
  '/guide/essentials/list.html',
  '/guide/essentials/event-handling.html',
  '/guide/essentials/forms.html',
  '/guide/components/registration.html',
  '/guide/components/props.html',
  '/guide/components/events.html',
  '/guide/reusability/composables.html',
  '/guide/scaling-up/routing.html',
  '/guide/scaling-up/state-management.html',
  '/api/',
];

export async function scrapeVue(): Promise<DocumentChunk[]> {
  console.log('🟢 Starting Vue.js documentation scrape...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const chunks: DocumentChunk[] = [];
  let processedCount = 0;

  try {
    for (const section of SECTIONS_TO_SCRAPE) {
      const url = `${BASE_URL}${section}`;
      console.log(`📄 Scraping: ${url}`);

      const page = await browser.newPage();
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Extract main content (Vue uses .vt-doc)
      const content = await page.evaluate(() => {
        const main = document.querySelector('.vt-doc, main, article');
        return main ? main.textContent : '';
      });

      const html = await page.evaluate(() => {
        const main = document.querySelector('.vt-doc, main, article');
        return main ? main.innerHTML : '';
      });

      if (content && content.trim().length > 100) {
        const markdown = turndownService.turndown(html);
        
        const title = await page.evaluate(() => {
          return document.querySelector('h1')?.textContent || 
                 document.querySelector('title')?.textContent || 
                 'Vue.js Documentation';
        });

        chunks.push({
          id: `vue-${processedCount}`,
          url: url,
          title: title.trim(),
          content: markdown,
          source: 'vue',
          metadata: {
            section: section,
            scrapeDate: new Date().toISOString(),
          },
        });

        processedCount++;
      }

      await page.close();
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ Vue: Scraped ${chunks.length} pages`);
  } catch (error) {
    console.error('❌ Vue scrape error:', error);
  } finally {
    await browser.close();
  }

  return chunks;
}

// For CLI usage
if (require.main === module) {
  scrapeVue().then((chunks) => {
    console.log(`\n📊 Summary:`);
    console.log(`  Total chunks: ${chunks.length}`);
    console.log(`  Run indexer to save to database`);
  });
}


import { getBrowser } from '../utils/browser-manager.js';
import { handlePageInteractions } from '../ai/page-interactions.js';
import { processHtmlContent } from './content-processor.js';
import { ScrapeResult, WebpageScrapeOptions } from '../types/index.js';
import { config } from '../config.js';
import { Page } from 'puppeteer';

/**
 * Visits a webpage, handles interactions, and extracts content
 * @param options Configuration options for the scraping operation
 * @returns Markdown content or error message
 */
export async function visitWebPage({
  url,
  autoInteract = true,
}: WebpageScrapeOptions): Promise<ScrapeResult> {
  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    if (config.cookie) {
      const cookies = config.cookie.split(';').map(cookie => {
        const [name, ...value] = cookie.trim().split('=');
        return { name: name || '', value: value.join('='), url };
      });
      await page.setCookie(...cookies);
    }

    await page.setViewport({ width: 1280, height: 800 });

    console.log(`Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'networkidle2' });
    if (autoInteract) {
      console.log("Handling page interactions...");
      await handlePageInteractions(page!);
    }

    const htmlContent = await page!.evaluate(() => document.body.innerHTML);
    console.log(`htmlContent: ${htmlContent}`);
    const markdown = await processHtmlContent(htmlContent);

    console.log(`Successfully scraped and converted: ${url}`);
    return { data: markdown };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error scraping ${url}:`, message);
    return { error: { message } };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

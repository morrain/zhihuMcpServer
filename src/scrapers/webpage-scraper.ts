import puppeteerExtraImport from 'puppeteer-extra';
import StealthPluginImport from 'puppeteer-extra-plugin-stealth';


import { handlePageInteractions } from '../ai/page-interactions.js';
import { processHtmlContent } from './content-processor.js';
import { ScrapeResult, WebpageScrapeOptions } from '../types/index.js';
import { config } from '../config.js';

// Work around TypeScript issues with puppeteer-extra
const puppeteerExtra = puppeteerExtraImport as any;
const StealthPlugin = StealthPluginImport as any;

// Apply stealth plugin
puppeteerExtra.use(StealthPlugin());

/**
 * Visits a webpage, handles interactions, and extracts content
 * @param options Configuration options for the scraping operation
 * @returns Markdown content or error message
 */
export async function visitWebPage({
  url,
  autoInteract = true,
  waitForNetworkIdle = true,
}: WebpageScrapeOptions): Promise<ScrapeResult> {
  // Launch puppeteer with stealth plugin and respect headless configuration
  const browser = await puppeteerExtra.launch({
    headless: config.headless ? "new" : false, // Use config.headless setting
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    dumpio: true, // Enable verbose logging from the browser
  });
  
  try {
    console.log(`Visiting webpage: ${url}`);
    const page = await browser.newPage();

    // Set cookie if provided in config
    if (config.cookie) {
      console.log("Setting cookie...");
      const cookies = config.cookie.split(';').map(cookie => {
        const [name, ...value] = cookie.trim().split('=');
        return { name, value: value.join('='), url };
      });
      await page.setCookie(...cookies);
    }
    
    // Set viewport to a standard desktop size
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to the URL
    await page.goto(url, { 
      waitUntil: waitForNetworkIdle ? 'networkidle2' : 'domcontentloaded' 
    });
    
    // Allow initial page load to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Handle page interactions if enabled
    if (autoInteract) {
      console.log("Checking for interactive elements that need handling...");
      await handlePageInteractions(page);
    }
    
    // Extract content after handling interactions
    const htmlContent: string = await page.evaluate(() => {
      // Try to select the main content area, fallback to the body if no specific selector
      const main = document.querySelector('main') || 
                  document.querySelector('article') || 
                  document.querySelector('.content') ||
                  document.querySelector('#content') ||
                  document.body;
      return main.innerHTML;
    });

    // Process the HTML content
    const markdown = await processHtmlContent(htmlContent);
    
    await browser.close();
    console.log(`Successfully scraped and converted to markdown: ${url}`);
    
    return { data: markdown };
  }
  catch(error) {
    await browser.close();
    if (error instanceof Error) {
      console.error(`Error scraping ${url}:`, error.message);
      return {
        error: {
          message: error.message,
        },
      };
    } else {
      console.error(`Unknown error scraping ${url}`);
      return {
        error: {
          message: "An unknown error occurred",
        },
      };
    }
  }
}
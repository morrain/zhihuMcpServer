import puppeteerExtraImport from 'puppeteer-extra';
import StealthPluginImport from 'puppeteer-extra-plugin-stealth';
import { config } from '../config.js';

// Work around TypeScript issues with puppeteer-extra
const puppeteerExtra = puppeteerExtraImport as any;
const StealthPlugin = StealthPluginImport as any;

// Apply stealth plugin
puppeteerExtra.use(StealthPlugin());

interface HotQuestionResult {
  data?: {
    name: string;
    url: string;
  };
  error?: {
    message: string;
  };
}

export async function getHotQuestion({ url }: { url: string }): Promise<HotQuestionResult> {
  const browser = await puppeteerExtra.launch({
    headless: config.headless ? "new" : false,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    console.log(`Visiting hot question page: ${url}`);
    const page = await browser.newPage();

    if (config.cookie) {
      console.log("Setting cookie...");
      const cookies = config.cookie.split(';').map(cookie => {
        const [name, ...value] = cookie.trim().split('=');
        return { name, value: value.join('='), url };
      });
      await page.setCookie(...cookies);
    }

    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const questionData = await page.evaluate(() => {
      // Find all elements containing the text "写回答"
      const writeButtons = Array.from(document.querySelectorAll('button, a')).filter(el => el.textContent?.trim().includes('写回答'));

      if (writeButtons.length === 0) {
        return null;
      }

      const writeButton = writeButtons[0];
      if (!writeButton) return null;

      // The "写回答" element is often a link or inside a link. Find the closest 'a' tag to get the URL.
      const writeAnchor = writeButton.closest('a');
      if (!writeAnchor) {
        return null; // "写回答" is not inside a link, cannot get URL.
      }
      const url = writeAnchor.href;

      // Traverse up the DOM from the "写回答" button to find a common ancestor
      // that contains both the button and the question title link.
      let container = writeButton.parentElement;
      for (let i = 0; i < 10 && container; i++) {
        // Look for the question link within the current container.
        // This link contains "/question/" but not "?write".
        const questionLink = container.querySelector('a[href*="/question/"]:not([href*="?write"])');

        if (questionLink) {
          const name = questionLink.textContent?.trim();

          // Check if we found a valid name and URL.
          if (name && name.length > 5) { // Basic validation for title length
            return { name, url };
          }
        }
        container = container.parentElement;
      }

      return null; // Return null if no matching structure was found
    });

    await browser.close();

    if (questionData) {
      console.log(`Found hot question: ${questionData.name}`);
      return { data: questionData };
    } else {
      return { error: { message: "No question link found on the page." } };
    }

  } catch (error) {
    await browser.close();
    if (error instanceof Error) {
      console.error(`Error getting hot question from ${url}:`, error.message);
      return { error: { message: error.message } };
    } else {
      console.error(`Unknown error getting hot question from ${url}`);
      return { error: { message: "An unknown error occurred" } };
    }
  }
}

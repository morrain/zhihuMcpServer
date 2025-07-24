import { getBrowser } from '../utils/browser-manager.js';
import { config } from '../config.js';
import { Page } from 'puppeteer';

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
    console.log(`Navigating to hot question page: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
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
          // Clone the node to avoid modifying the live DOM.
          const clone = questionLink.cloneNode(true) as HTMLElement;

          // The tag is usually a div inside the first div of the link.
          // We remove it to get only the question text, based on structure, not class.
          const mainContainer = clone.querySelector('div');
          if (mainContainer) {
            const tagElement = mainContainer.querySelector('div');
            if (tagElement) {
              tagElement.remove();
            }
          }

          const name = clone.textContent?.trim();

          // Check if we found a valid name and URL.
          if (name && name.length > 5) { // Basic validation for title length
            return { name, url };
          }
        }
        container = container.parentElement;
      }

      return null; // Return null if no matching structure was found
    });


    if (questionData) {
      console.log(`Found hot question: ${questionData.name}`);
      return { data: questionData };
    } else {
      return { error: { message: "No question link found on the page." } };
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    console.error(`Error getting hot question from ${url}:`, message);
    return { error: { message } };
  } finally {
    if (page) {
      await page.close();
    }
  }
}


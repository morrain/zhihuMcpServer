import { getBrowser } from "../utils/browser-manager.js";
import { setCookiesOnPage } from '../utils/cookie-manager.js';
import { Page } from 'puppeteer';

interface PublishAnswerParams {
  url: string;
  answer: string;
}

export async function publishAnswer({
  url,
  answer,
}: PublishAnswerParams): Promise<{ success: boolean; error?: string }> {
  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    // await page.setRequestInterception(true);
    // page.on('request', (req) => {
    //   if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
    //     req.abort();
    //   } else {
    //     req.continue();
    //   }
    // });

    await setCookiesOnPage(page);
    await page.setViewport({ width: 1280, height: 800 });
    console.log(`Navigating to answer page: ${url}`);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    // Wait for the editor to be ready and type the answer
    const editorSelector = ".public-DraftEditor-content";
    await page.waitForSelector(editorSelector);
    await page.click(editorSelector);
    await page.keyboard.type(answer, { delay: 30 });

    // Find and click the publish button
    const buttonSelector = ".is-bottom button.Button--primary";
    const publishButton = await page.waitForSelector(buttonSelector);

    if (publishButton) {
      await publishButton.click();
    } else {
      throw new Error("Publish button not found");
    }

    // Wait for navigation to complete after publishing
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });

    return { success: true };
  } catch (error: any) {
    console.error(`Error in publishAnswer: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    if (page) {
      await page.close();
    }
  }
}


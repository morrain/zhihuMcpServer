import { getBrowser } from "../utils/browser-manager.js";
import { setCookiesOnPage } from "../utils/cookie-manager.js";
import { Page } from "puppeteer";

interface PublishAnswerParams {
  url: string;
  answer: string;
  isAi?: boolean;
}

export async function publishAnswer({
  url,
  answer,
  isAi = true,
}: PublishAnswerParams): Promise<{ success: boolean; error?: string }> {
  let page: Page | null = null;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (
        req.url().includes("unpkg.zhimg.com") ||
        req.url().includes("collector/web_json") ||
        req.url().includes("sc-critical?") ||
        req.url().includes("baidu.com/hm.gif") ||
        req.url().includes("linksubmit/push.js") ||
        req.url().includes("picx.zhimg.com")
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await setCookiesOnPage(page);
    await page.setViewport({ width: 1280, height: 800 });
    console.log(`Navigating to answer page: ${url}`);
    await page.goto(url, { waitUntil: "load", timeout: 60000 });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    // Wait for the editor to be ready and type the answer
    const editorSelector = ".public-DraftEditor-content";
    await page.waitForSelector(editorSelector);
    await page.click(editorSelector);
    await page.keyboard.type(answer, { delay: 30 });

    // Select creation type declaration
    if (isAi) {
      try {
        console.log('Selecting creation type...');

        const declarationButtonXPath = "//button[contains(., '无声明')]";
        await page.waitForFunction(
          (xpath) => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
          { timeout: 5000 },
          declarationButtonXPath
        );
        
        await page.evaluate((xpath) => {
            const button = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement;
            if (button) {
                button.click();
            } else {
                throw new Error('Declaration button not found in evaluate.');
            }
        }, declarationButtonXPath);


        // Click the 'AI-assisted' option.
        const aiOptionXPath = "//div[@role='listbox']//button[contains(., '包含 AI 辅助创作')]";
        await page.waitForFunction(
          (xpath) => document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
          { timeout: 5000 },
          aiOptionXPath
        );

        await page.evaluate((xpath) => {
            const button = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as HTMLElement;
            if (button) {
                button.click();
            } else {
                throw new Error("'AI-assisted creation' option not found in evaluate.");
            }
        }, aiOptionXPath);

        // Wait for the dropdown to disappear to confirm selection.
        await page.waitForFunction(
          (xpath) => !document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
          { timeout: 5000 },
          aiOptionXPath
        );
        
        console.log('Successfully selected creation type.');
      } catch (e: any) {
        throw new Error(`Failed to select creation type: ${e.message}`);
      }
    }

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

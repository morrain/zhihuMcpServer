import { getBrowser } from "../utils/browser-manager.js";
import { setCookiesOnPage } from "../utils/cookie-manager.js";
import { Page } from "puppeteer";
import { attachPageLogger } from "../utils/page-logger.js";

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
    attachPageLogger(page);

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
    await page.goto(url, { waitUntil: "load", timeout: 600000 });
    console.log("Page navigation successful.");

    await new Promise((resolve) => setTimeout(resolve, 3000));
    
    console.log("Waiting for editor to appear...");
    const editorSelector = ".public-DraftEditor-content";
    await page.waitForSelector(editorSelector, { timeout: 60000 });
    console.log("Editor found. Clicking and typing answer...");
    await page.click(editorSelector);
    await page.keyboard.type(answer, { delay: 30 });
    console.log("Answer successfully typed.");

    // Select creation type declaration
    if (isAi) {
      try {
        console.log("Starting strict creation type selection...");

        const declarationButtonXPath = "//label[contains(., '创作声明')]/following-sibling::div[1]//button";
        const declarationButton = await page.waitForSelector(`xpath/${declarationButtonXPath}`, { timeout: 10000 });

        if (!declarationButton) {
          throw new Error("Creation declaration button was not found.");
        }

        const buttonText = await declarationButton.evaluate(el => el.textContent);
        console.log(`Found declaration button with text: "${buttonText}"`);

        if (buttonText && buttonText.includes('无声明')) {
          console.log("Declaration is '无声明', proceeding to select AI-assisted.");
          await declarationButton.click();
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for animation

          const aiOptionXPath = "//div[@role='listbox']//button[contains(., '包含 AI 辅助创作')]";
          console.log("Waiting for AI-assisted creation option...");
          const aiOptionButton = await page.waitForSelector(`xpath/${aiOptionXPath}`, { timeout: 10000 });

          if (!aiOptionButton) {
            throw new Error("'AI-assisted creation' option not found in dropdown.");
          }
          
          console.log("AI-assisted creation option found. Clicking...");
          await aiOptionButton.click();
          
          console.log("Waiting for dropdown to disappear...");
          await page.waitForSelector(`xpath/${aiOptionXPath}`, { hidden: true, timeout: 5000 });
          console.log("Successfully selected 'AI-assisted creation'.");

        } else if (buttonText && buttonText.includes('包含 AI 辅助创作')) {
          console.log("Creation type is already set to 'AI-assisted creation'. No action needed.");
        } else {
          throw new Error(`Declaration button has unexpected text: "${buttonText}".`);
        }
      } catch (e: any) {
        throw new Error(`Failed to select creation type: ${e.message}`);
      }
    }

    // Find and click the publish button
    console.log("Finding publish button...");
    const buttonSelector = ".is-bottom button.Button--primary";
    const publishButton = await page.waitForSelector(buttonSelector);

    if (publishButton) {
      console.log("Publish button found. Clicking...");
      await publishButton.click();
    } else {
      throw new Error("Publish button not found");
    }

    // Wait for navigation to complete after publishing
    console.log("Waiting for navigation after publish...");
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    console.log("Navigation after publish successful.");

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

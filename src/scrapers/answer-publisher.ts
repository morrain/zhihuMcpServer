import { getBrowser } from "../utils/browser-manager.js";
import { setCookiesOnPage } from "../utils/cookie-manager.js";
import { Page } from "puppeteer";

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

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Select "AI-assisted creation" declaration
    try {
      console.log("Opening declaration dropdown...");
      const dropdownXPath =
        "xpath/" + "//label[contains(., '创作声明')]/following-sibling::div//button";
      const dropdownButton = await page.waitForSelector(dropdownXPath, {
        timeout: 5000,
      });
      if (dropdownButton) {
        await dropdownButton.click();
        await new Promise((resolve) => setTimeout(resolve, 500)); // wait for dropdown to open

        console.log("Selecting 'AI-assisted creation' option...");
        const optionXPath = "xpath/" + "//button[contains(., '包含AI辅助创作')]";
        const optionButton = await page.waitForSelector(optionXPath, {
          timeout: 5000,
        });

        if (optionButton) {
          await optionButton.click();
          await new Promise((resolve) => setTimeout(resolve, 500)); // wait for selection to register
        } else {
          console.warn(
            "AI-assisted creation option not found. Proceeding without it."
          );
        }
      }
    } catch (e) {
      console.warn(
        "Could not select 'AI-assisted creation' declaration. Proceeding without it."
      );
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

import puppeteerExtraImport from "puppeteer-extra";
import StealthPluginImport from "puppeteer-extra-plugin-stealth";
import { executablePath } from "puppeteer";
import { config } from "../config.js";

// Work around TypeScript issues with puppeteer-extra
const puppeteerExtra = puppeteerExtraImport as any;
const StealthPlugin = StealthPluginImport as any;

puppeteerExtra.use(StealthPlugin());

interface PublishAnswerParams {
  url: string;
  answer: string;
}

export async function publishAnswer({
  url,
  answer,
}: PublishAnswerParams): Promise<{ success: boolean; error?: string }> {
  const browser = await puppeteerExtra.launch({
    headless: config.headless,
    executablePath: executablePath(),
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();

    if (config.cookie) {
      console.log("Setting cookie...");
      const cookies = config.cookie.split(";").map((cookie: string) => {
        const [name, ...value] = cookie.trim().split("=");
        return { name, value: value.join("="), url };
      });
      await page.setCookie(...cookies);
    }
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(url, { waitUntil: "networkidle2" });

    // Wait for the editor to be ready and type the answer
    const editorSelector = ".public-DraftEditor-content";
    await page.waitForSelector(editorSelector);
    await page.click(editorSelector);
    await page.keyboard.type(answer, { delay: 120 });

    // Find and click the publish button
    const buttonSelector = ".is-bottom button.Button--primary";
    const publishButton = await page.waitForSelector(buttonSelector);

    if (publishButton) {
      await publishButton.click();
    } else {
      throw new Error("Publish button not found");
    }

    // Wait for navigation to complete after publishing
    await page.waitForNavigation({ waitUntil: "networkidle2" });

    return { success: true };
  } catch (error: any) {
    console.error(`Error in publishAnswer: ${error.message}`);
    return { success: false, error: error.message };
  } finally {
    await browser.close();
  }
}

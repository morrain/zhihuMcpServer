
import puppeteerExtraImport from 'puppeteer-extra';
import { Browser } from 'puppeteer';
import StealthPluginImport from 'puppeteer-extra-plugin-stealth';

const puppeteer = puppeteerExtraImport as any;
const StealthPlugin = StealthPluginImport as any;

puppeteer.use(StealthPlugin());

let browserInstance: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  console.log('Launching new browser instance...');
  const browser = await puppeteer.launch({
    headless: process.env.DISABLE_HEADLESS !== 'true',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  console.log('Browser instance launched successfully.');
  return browser;
}

export function getBrowser(): Promise<Browser> {
  if (!browserInstance) {
    browserInstance = launchBrowser();
  }
  return browserInstance;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('Closing browser instance...');
    const browser = await browserInstance;
    await browser.close();
    browserInstance = null;
    console.log('Browser instance closed.');
  }
}

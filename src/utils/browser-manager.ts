
import puppeteerExtraImport from 'puppeteer-extra';
import { Browser } from 'puppeteer';
import StealthPluginImport from 'puppeteer-extra-plugin-stealth';
import path from 'path';

const puppeteer = puppeteerExtraImport as any;
const StealthPlugin = StealthPluginImport as any;

puppeteer.use(StealthPlugin());

let browserInstance: Promise<Browser> | null = null;

async function launchBrowser(): Promise<Browser> {
  console.log('Launching new browser instance...');
  const userDataDir = path.resolve(process.cwd(), './cache/puppeteer_user_data');
  console.log(`Using user data directory: ${userDataDir}`);
  const browser = await puppeteer.launch({
    headless: process.env.DISABLE_HEADLESS !== 'true',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-extensions',
      '--disable-popup-blocking',
      '--mute-audio',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-breakpad',
      '--disable-client-side-phishing-detection',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-hang-monitor',
      '--disable-ipc-flooding-protection',
      '--disable-notifications',
      '--disable-sync',
      '--disable-translate',
      '--metrics-recording-only',
      '--no-default-browser-check',
      '--safebrowsing-disable-auto-update',
    ],
    userDataDir: userDataDir,
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

import fs from 'fs/promises';

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    console.log('Closing browser instance...');
  
    // Also, clean up any session files like cookies
    try {
      const qrCodeDir = path.resolve(process.cwd(), './qrcodes');
      const cookiePath = path.join(qrCodeDir, 'cookies.json');
      await fs.unlink(cookiePath);
      console.log('Cleaned up cookies file.');
    } catch (error: any) {
      // It's okay if the file doesn't exist
      if (error.code !== 'ENOENT') {
        console.error('Error cleaning up cookies file:', error);
      }
    }

    const browser = await browserInstance;
    await browser.close();
    browserInstance = null;
    console.log('Browser instance closed.');
  }
}

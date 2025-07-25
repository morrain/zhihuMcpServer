import fs from 'fs/promises';
import path from 'path';
import { Page, Cookie } from 'puppeteer';

const COOKIE_PATH = path.resolve(process.cwd(), './qrcodes/cookies.json');

/**
 * Reads cookies from the stored cookie file.
 * @returns An array of cookies or an empty array if the file doesn't exist.
 */
export async function getStoredCookies(): Promise<Cookie[]> {
  try {
    const cookieJson = await fs.readFile(COOKIE_PATH, 'utf-8');
    const cookies = JSON.parse(cookieJson);
    return cookies as Cookie[];
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Cookie file doesn't exist yet.
      return [];
    }
    console.error('Error reading cookie file:', error);
    return [];
  }
}

/**
 * Sets the stored cookies for a given Puppeteer page.
 * @param page The Puppeteer page instance.
 */
export async function setCookiesOnPage(page: Page) {
  const cookies = await getStoredCookies();
  if (cookies.length > 0) {
    console.log('Setting stored cookies on the page.');
    await page.setCookie(...cookies);
  }
}

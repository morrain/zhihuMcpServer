import puppeteer from 'puppeteer-extra';
import { Browser, Page } from 'puppeteer';
import { getBrowser } from '../utils/browser-manager.js';
import { config } from '../config.js';
import path from 'path';
import fs from 'fs/promises';

async function switchToQrCodeLogin(page: Page, switchQrSelector: string, qrSelector: string) {
    const switchButton = await page.$(switchQrSelector);
    if (switchButton) {
        await switchButton.click();
        await page.waitForSelector(qrSelector, { visible: true });
    }
}

/**
 * Waits for the user to log in and then saves the session cookies.
 * This function runs in the background and does not block the main thread.
 * @param page The Puppeteer page instance.
 */
async function handlePostLogin(page: Page): Promise<void> {
    try {
        console.log('Waiting for user to scan QR code to log in...');
        // Wait for navigation to complete after successful login
        await page.waitForNavigation({ timeout: 60000, waitUntil: 'networkidle2' });
        console.log('Login successful. Saving cookies...');

        // Save cookies to a file
        const cookies = await page.cookies();
        const qrCodeDir = path.resolve(process.cwd(), './qrcodes');
        const cookiePath = path.join(qrCodeDir, 'cookies.json');
        await fs.writeFile(cookiePath, JSON.stringify(cookies, null, 2));
        console.log(`Cookies saved to ${cookiePath}`);

        // Clean up the QR code image file as it's no longer needed
        const qrCodeImagePath = path.join(qrCodeDir, 'login-qrcode.png');
        try {
            await fs.unlink(qrCodeImagePath);
            console.log('Cleaned up QR code image.');
        } catch (error: any) {
            // It's okay if the file doesn't exist or other errors occur
            if (error.code !== 'ENOENT') {
                console.error('Error cleaning up QR code image:', error);
            }
        }
    } catch (error) {
        // Log the error, but don't throw, as this is a background task.
        console.error('An error occurred during the post-login process:', error);
    } finally {
        if (page && !page.isClosed()) {
            console.log('Closing login page.');
            await page.close();
        }
    }
}

async function getLoginQrCode(qrSelector: string = '.Qrcode-qrcode', switchQrSelector?: string): Promise<string> {
    let browser: Browser | null = null;
    try {
        browser = await getBrowser();
        if (!browser) {
            throw new Error('Could not get browser instance.');
        }
        const page = await browser.newPage();
        await page.goto('https://www.zhihu.com/signin', { waitUntil: 'networkidle2' });

        if (switchQrSelector) {
            await switchToQrCodeLogin(page, switchQrSelector, qrSelector);
        }

        const qrCodeElement = await page.waitForSelector(qrSelector, { timeout: 10000 });
        
        if (!qrCodeElement) {
            throw new Error('Could not find QR code element on the page.');
        }

        const qrCodeDir = path.resolve(process.cwd(), './qrcodes');
        await fs.mkdir(qrCodeDir, { recursive: true });
        const qrCodeImagePath = path.join(qrCodeDir, 'login-qrcode.png');

        await qrCodeElement.screenshot({ path: qrCodeImagePath });
        const base64 = await qrCodeElement.screenshot({ encoding: 'base64' });
        const qrcodePngBase64 = `data:image/png;base64,${base64}`;

        // Start the post-login handling in the background without awaiting it.
        handlePostLogin(page);

        console.log('QR code has been returned. Please scan it to continue.');
        console.log(qrcodePngBase64);        
        return qrcodePngBase64;

    } catch (error:any) {
        console.error('Error getting login QR code:', error);
        throw new Error('Failed to get login QR code: ' + error.message);
    } finally {
        // The browser and page are intentionally not closed here to allow the 
        // background login process to complete.
    }
}

export { getLoginQrCode };
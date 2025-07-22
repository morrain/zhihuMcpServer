import { Page } from 'puppeteer';

// List of common keywords for cookie consent buttons
const consentKeywords = [
  'accept',
  'agree',
  'confirm',
  'continue',
  'got it',
  'i understand',
  'ok',
];

/**
 * Clicks on elements that match the target text across all frames
 * @param page Puppeteer page instance
 * @param keywords A list of keywords to search for in clickable elements
 * @returns Whether any elements were clicked
 */
export async function clickElementsWithKeywords(page: Page, keywords: string[]): Promise<boolean> {
  const frames = page.frames();
  let clickedSomething = false;

  for (const frame of frames) {
    try {
      const elements = await frame.$$('a, button');
      for (const element of elements) {
        const textContent = (await frame.evaluate(el => el.textContent, element))?.toLowerCase() || '';
        if (keywords.some(keyword => textContent.includes(keyword))) {
          try {
            await element.click();
            console.log(`Clicked element with text: "${textContent}"`);
            clickedSomething = true;
            // Wait a bit for the page to react
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (clickError) {
            console.error(`Error clicking element with text "${textContent}":`, clickError);
          }
        }
      }
    } catch (error) {
      console.error(`Error processing frame "${frame.name() || frame.url()}"`, error);
    }
  }

  return clickedSomething;
}

/**
 * Handles interactions with the page by looking for common pop-ups
 * @param page Puppeteer page instance
 * @returns Whether any interactions were performed
 */
export async function handlePageInteractions(page: Page): Promise<boolean> {
  console.log("Attempting to handle common interactions (e.g., cookie banners)...");

  // Try to find and click common consent buttons
  const clickedConsent = await clickElementsWithKeywords(page, consentKeywords);

  if (clickedConsent) {
    console.log("Successfully handled a common interaction.");
    // Wait for any page changes to settle
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log("No common interactions were found or handled.");
  }

  return clickedConsent;
}
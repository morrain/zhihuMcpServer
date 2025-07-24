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
 * Clicks on elements that match the target text across all frames.
 * This function is designed to be robust against race conditions by performing
 * find and click operations within the browser's execution context.
 * @param page Puppeteer page instance
 * @param keywords A list of keywords to search for in clickable elements
 * @returns Whether any element was clicked
 */
export async function clickElementsWithKeywords(page: Page, keywords: string[]): Promise<boolean> {
  const frames = page.frames();

  for (const frame of frames) {
    try {
      // Use frame.evaluate to run the logic within the browser context for each frame
      const clickedText = await frame.evaluate((kws) => {
        const elements = document.querySelectorAll('a, button');
        for (const element of elements) {
          const text = element.textContent?.trim().toLowerCase() || '';
          if (kws.some(keyword => text.includes(keyword))) {
            // Check if the element is visible before clicking
            const style = window.getComputedStyle(element);
            const isVisible = style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
            if (isVisible && typeof (element as HTMLElement).click === 'function') {
              (element as HTMLElement).click();
              return element.textContent?.trim(); // Return the text of the clicked element
            }
          }
        }
        return null; // Return null if nothing was clicked
      }, keywords);

      if (clickedText) {
        console.log(`Clicked element with text: "${clickedText}" in frame: ${frame.url()}`);
        return true; // Found and clicked, so we are done.
      }
    } catch (error) {
      // Handle errors that occur when a frame is detached or closed during iteration
      if (error instanceof Error && (
        error.message.includes('Execution context was destroyed') ||
        error.message.includes('Cannot find context with specified id') ||
        error.message.includes('Target closed')
      )) {
        console.warn(`Skipping interaction on a detached or closed frame: ${frame.url()}`);
      } else {
        console.error(`Error processing frame "${frame.name() || frame.url()}":`, error);
      }
    }
  }

  return false; // Nothing was clicked in any frame.
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
    // Wait for any page changes to settle after the click
    await new Promise(resolve => setTimeout(resolve, 2000));
  } else {
    console.log("No common interactions were found or handled.");
  }

  return clickedConsent;
}

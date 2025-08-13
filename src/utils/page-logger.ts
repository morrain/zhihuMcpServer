import { Page } from 'puppeteer';

/**
 * Attaches a comprehensive logger to a Puppeteer Page instance to monitor its lifecycle events.
 * This is useful for debugging page load issues, network requests, and console errors.
 * 
 * @param page The Puppeteer Page object to attach the logger to.
 */
export function attachPageLogger(page: Page): void {
  console.log(`[Page Logger] Attaching logger to page: ${page.url()}`);

  page
    .on('request', (request) => {
      console.log(`[Page Logger] >> Request: ${request.method()} ${request.url()} (Type: ${request.resourceType()})`);
    })
    .on('requestfailed', (request) => {
      const failure = request.failure();
      console.error(`[Page Logger] XX Request Failed: ${request.method()} ${request.url()} (Error: ${failure ? failure.errorText : 'Unknown Error'})`);
    })
    .on('response', (response) => {
      console.log(`[Page Logger] << Response: ${response.status()} ${response.statusText()} for ${response.url()}`);
    })
    .on('domcontentloaded', () => {
      console.log('[Page Logger] -- DOMContentLoaded event fired --');
    })
    .on('load', () => {
      console.log('[Page Logger] -- Load event fired --');
    })
    .on('error', (err) => {
      console.error(`[Page Logger] !! Page Error: ${err.toString()}`);
    })
    .on('pageerror', (pageErr) => {
      console.error(`[Page Logger] !! Uncaught Exception in Page: ${pageErr.message}`);
    });
}

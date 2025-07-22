import { Page, ElementHandle } from 'puppeteer';



// Scraper options
export interface WebpageScrapeOptions {
  url: string;
  autoInteract?: boolean;
  waitForNetworkIdle?: boolean;
}

// Scraper result
export interface ScrapeResult {
  data?: string;
  error?: { message: string };
}

// MCP tool response - updated to match MCP SDK expectations
export interface ToolResponse {
  content: { 
    type: "text"; 
    text: string;
  }[];
  metadata?: {
    message: string;
    success: boolean;
    contentSize?: number;
  };
  isError?: boolean;
}
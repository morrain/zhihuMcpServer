import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { visitWebPage } from '../scrapers/webpage-scraper.js';
import { getHotQuestion } from '../scrapers/hot-question-scraper.js';
import { publishAnswer } from '../scrapers/answer-publisher.js';
import { getLoginQrCode } from '../scrapers/login-scraper.js';

/**
 * Registers MCP tools with the server
 * @param server The MCP server instance
 */
export function registerTools(server: McpServer): void {
  server.tool(
    "login-with-qrcode",
    "访问知乎登陆页面,并获取二维码",
    {
      qrSelector: z.string().optional().describe('The CSS selector for the QR code element'),
      switchQrSelector: z.string().optional().describe('The CSS selector for the button to switch to QR code login'),
    },
    async ({ qrSelector, switchQrSelector }, _extra) => {
      console.log(`Received login-with-qrcode request`);

      try {
        const result = await getLoginQrCode(qrSelector, switchQrSelector);
        return createSuccessResponse(result, "QR code generated successfully");
      } catch (error: any) {
        console.error("Error processing 'login-with-qrcode' tool:", error);
        return createErrorResponse(`Error getting login QR code: ${error.message}`);
      }
    }
  );

  server.tool(
    "scrape-webpage",
    "访问页面，提取页面内容并转化为 markdown 格式",
    {
      url: z.string().url().describe("The URL of the webpage to scrape"),
      autoInteract: z.boolean().optional().default(true).describe("Whether to automatically handle interactive elements like cookies, captchas, etc."),
    },
    async ({ url, autoInteract }, _extra) => {
      console.log(`Received scrape request for URL: ${url}, autoInteract: ${autoInteract}`);

      try {
        const result = await visitWebPage({ 
          url, 
          autoInteract, 
        });

        if (result.error) {
          return createErrorResponse(result.error.message);
        }

        // Limit the size of returned content if too large
        const maxLength = 100000; // Set a reasonable limit
        let markdownContent = result.data || "";
        let message = "Scraping successful";
        
        if (markdownContent.length > maxLength) {
          markdownContent = markdownContent.substring(0, maxLength);
          message = `Content truncated due to size (total size: ${markdownContent.length} characters)`;
        }
        
        console.log(`Scraping successful. Payload size: ${markdownContent.length} chars.`);

        return createSuccessResponse(markdownContent, message);
      } catch (error: any) {
        console.error("Error processing 'scrape-webpage' tool:", error);
        return createErrorResponse(`Error scraping webpage: ${error.message}`);
      }
    }
  );

  server.tool(
    "get-hot-question",
    "获取热点问题, get hot question",
    {
      url: z.string().url().optional().default('https://www.zhihu.com/creator/hot-question/hot/0/day').describe("The Page URL to find the hot question on"),
    },
    async ({ url }, _extra) => {
      console.log(`Received get-hot-question request for URL: ${url}`);

      try {
        const result = await getHotQuestion({ url });

        if (result.error) {
          return createErrorResponse(result.error.message);
        }

        if (result.data) {
          return {
            content: [{ type: "text", text: JSON.stringify(result.data) }],
            _meta: {
              message: "Successfully retrieved hot question",
              success: true,
            },
            isError: false,
          };
        }

        return createErrorResponse("Hot question data not found.");
      } catch (error: any) {
        console.error("Error processing 'get-hot-question' tool:", error);
        return createErrorResponse(`Error getting hot question: ${error.message}`);
      }
    }
  );

  server.tool(
    "publish-answer",
    "发布回答, publish answer",
    {
      url: z.string().url().describe("The Page URL of the question to answer"),
      answer: z.string().describe("The answer to publish"),
    },
    async ({ url, answer }, _extra) => {
      console.log(`Received publish-answer request for URL: ${url}`);

      try {
        const result = await publishAnswer({ url, answer });

        if (result.error) {
          return createErrorResponse(result.error);
        }

        return createSuccessResponse("Answer published successfully.");
      } catch (error: any) {
        console.error("Error processing 'publish-answer' tool:", error);
        return createErrorResponse(`Error publishing answer: ${error.message}`);
      }
    }
  );
}

/**
 * Creates a success response for the MCP tool
 * @param text The markdown text content
 * @param message An optional message to include
 * @returns The formatted tool response
 */
function createSuccessResponse(text: string, message: string = "Scraping successful") {
  return {
    content: [{ type: "text" as const, text }],
    _meta: {
      message,
      success: true,
      contentSize: text.length
    },
    isError: false
  };
}

/**
 * Creates an error response for the MCP tool
 * @param message The error message
 * @returns The formatted tool response
 */
function createErrorResponse(message: string) {
  return {
    content: [{ type: "text" as const, text: "" }],
    _meta: {
      message: message,
      success: false
    },
    isError: true
  };
}
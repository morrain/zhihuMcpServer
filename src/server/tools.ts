import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { visitWebPage } from '../scrapers/webpage-scraper.js';
import { getHotQuestion } from '../scrapers/hot-question-scraper.js';
import { publishAnswer } from '../scrapers/answer-publisher.js';
import { getLoginQrCode } from '../scrapers/login-scraper.js';
import { promises as fs } from 'fs';
import path from 'path';

/**
 * Registers MCP tools with the server
 * @param server The MCP server instance
 */
export function registerTools(server: McpServer): void {
  server.tool(
    "login-with-qrcode",
    "访问知乎登陆页面，并获取二维码。",
    {
      qrSelector: z.string().optional().describe('用于提取二维码的HTML选择器，默认值:.Qrcode-qrcode。'),
      switchQrSelector: z.string().optional().describe('切换成二维码登录方式对应的HTML选择器，默认为空。不为空时会操作点击切换成二维码登录方式。'),
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
    "get-login-status",
    "获取登录状态，登陆完成返回1,没有登陆完成返回0",
    {},
    async (_, _extra) => {
      console.log(`Received get-login-status request`);
      const cookiesPath = path.join(process.cwd(), 'qrcodes', 'cookies.json');
      try {
        await fs.access(cookiesPath);
        return createSuccessResponse("1", "User is considered logged in.");
      } catch (error) {
        return createSuccessResponse("0", "User is not logged in.");
      }
    }
  );

  server.tool(
    "scrape-webpage",
    "访问页面，提取页面内容并转化为 markdown 格式。",
    {
      url: z.string().url().describe("要提取页面的URL。"),
      autoInteract: z.boolean().optional().default(true).describe("是否自动自动点击页面加载时的弹框，譬如cookie设置弹框等。"),
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
    "获取热点问题，可以获取小时榜、日榜、周榜。",
    {
      type: z.enum(['hour', 'day', 'week']).optional().default('day').describe("获取热点问题榜单的类型，如 'hour', 'day', or 'week'"),
    },
    async ({ type }, _extra) => {
      console.log(`Received get-hot-question request for type: ${type}`);

      try {
        const result = await getHotQuestion({ type });

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
      url: z.string().url().describe("发布回答对应的页面地址。"),
      answer: z.string().describe("回答的内容。"),
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
### GEMINI.md - System Prompt for gemini-cli

This document provides instructions and context for the AI assistant (`gemini-cli`) working on the `puppeteer-mcp-server` project.

---

### Project Overview

You are working on a **TypeScript-based MCP (Model Context Protocol) server**. Its primary function is to act as an intelligent web scraping tool. It uses Puppeteer to render web pages and a simple rule-based system to interact with elements like cookie banners. After navigating these obstacles, it extracts the main content of the page, converts it to Markdown, and returns it to the user.

### Core Technologies

When modifying or adding code, adhere to the patterns and libraries already in use:

- **Language**: TypeScript
- **Runtime**: Node.js
- **Package Manager**: npm
- **Protocol**: `@modelcontextprotocol/sdk` for the MCP server implementation.
- **Browser Automation**: `puppeteer` and `puppeteer-extra` with `puppeteer-extra-plugin-stealth` to avoid bot detection.
- **Content Extraction**: `@mozilla/readability` to isolate the main article content.
- **HTML to Markdown**: `turndown` for converting cleaned HTML to Markdown.
- **DOM Manipulation**: `jsdom` for server-side DOM parsing.
- **Configuration**: `dotenv` for managing environment variables from a `.env` file.
- **Schema Validation**: `zod` for defining the schema of the `scrape-webpage` tool.

### Project Structure and Key Files

- **`src/index.ts`**: The main entry point. It initializes `dotenv` and starts the MCP server.
- **`src/server/mcp-server.ts`**: Creates the `McpServer` instance and orchestrates the setup of tools and transports.
- **`src/server/tools.ts`**: **This is where the `scrape-webpage` tool is defined.** To modify the tool's parameters (using `zod`) or its core implementation, edit this file.
- **`src/server/transports.ts`**: Configures the communication layer (`stdio`, `sse`, or `http`) for the server.
- **`src/scrapers/webpage-scraper.ts`**: Contains the main browser automation logic. The `visitWebPage` function launches Puppeteer, navigates to the URL, and calls the interaction and content processing modules.
- **`src/scrapers/content-processor.ts`**: Takes the raw HTML from Puppeteer, uses `Readability` to extract the main content, sanitizes it, and converts it to Markdown using `turndown`.
- **`src/ai/page-interactions.ts`**: Implements the logic to handle basic page interactions by searching for keywords in buttons.
- **`src/config.ts`**: Reads and exports all configuration from environment variables (`process.env`).
- **`package.json`**: Defines all dependencies and scripts. Use this to understand available commands.
- **`tsconfig.json`**: TypeScript compiler options. The output directory is `build/`.

### Common Commands

- **Install dependencies**: `npm install`
- **Compile TypeScript**: `npm run build` (compiles `src/` to `build/`)
- **Run the server (after building)**: `npm start`
- **Develop (auto-rebuild and run)**: `npm run dev`

### Development Workflow

When asked to modify the project:

1.  Make changes to the relevant `.ts` files in the `src/` directory.
2.  After making changes, you **must** re-compile the project by running the build command.
    - **Command**: `npm run build`
3.  To test the changes, run the server.
    - **Command**: `npm start`

### Configuration

- The server can be configured with environment variables, documented in the `README.md` and processed in `src/config.ts` (e.g., `TRANSPORT_TYPE`, `DISABLE_HEADLESS`).
- To see the browser in action while debugging, set `DISABLE_HEADLESS=true` in your `.env` file.
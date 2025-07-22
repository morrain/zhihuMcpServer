# Puppeteer MCP Server

This Model Context Protocol (MCP) server provides a tool for scraping webpages and converting them to markdown format using Puppeteer, Readability, and Turndown. It features a simple, rule-based interaction mechanism to handle common elements like cookie banners.

**Now easily runnable via `npx`!**

## Features

- Scrapes webpages using Puppeteer with stealth mode
- Uses a rule-based system to automatically handle common pop-ups (e.g., cookie consent banners).
- Extracts main content with Mozilla's Readability
- Converts HTML to well-formatted Markdown
- Special handling for code blocks, tables, and other structured content
- Accessible via the Model Context Protocol
- Option to view browser interaction in real-time by disabling headless mode
- Easily consumable as an `npx` package.

## Quick Start with NPX

The recommended way to use this server is via `npx`, which ensures you're running the latest version without needing to clone or manually install.

1.  **Prerequisites:** Ensure you have Node.js and npm installed.
2.  **Environment Setup (Optional):**
    You can configure the server using a `.env` file or shell environment variables.

    **Example `.env` file or shell exports:**
    ```env
    # Optional (defaults shown)
    # TRANSPORT_TYPE=stdio                     # Options: stdio, sse, http
    # PORT=3001                                # Only used in sse/http modes
    # DISABLE_HEADLESS=true                    # Uncomment to see the browser in action
    ```

3.  **Run the Server:**
    Open your terminal and run:
    ```bash
    npx -y puppeteer-mcp-server
    ```
    *   The `-y` flag automatically confirms any prompts from `npx`.
    *   This command will download (if not already cached) and execute the server.
    *   By default, it starts in `stdio` mode. Set `TRANSPORT_TYPE=sse` or `TRANSPORT_TYPE=http` for HTTP server modes.

## Using as an MCP Tool with NPX

This server is designed to be integrated as a tool within an MCP-compatible LLM orchestrator. Here's an example configuration snippet:

```json
{
  "mcpServers": {
    "web-scraper": {
      "command": "npx",
      "args": ["-y", "puppeteer-mcp-server"],
      "env": {
        // Optional:
        // "TRANSPORT_TYPE": "stdio", // or "sse" or "http"
        // "DISABLE_HEADLESS": "true" // To see the browser during operations
      }
    }
    // ... other MCP servers
  }
}
```
When configured this way, the MCP orchestrator will manage the lifecycle of the `puppeteer-mcp-server` process.

## Environment Configuration Details

Regardless of how you run the server (NPX or local development), it uses the following environment variables:
- **`TRANSPORT_TYPE`**: (Optional) The transport protocol to use.
  - Options: `stdio` (default), `sse`, `http`
  - `stdio`: Direct process communication (recommended for most use cases)
  - `sse`: Server-Sent Events over HTTP (legacy mode)
  - `http`: Streamable HTTP transport with session management
- **`PORT`**: (Optional) The port for the HTTP server in SSE or HTTP mode.
  - Default: `3001`.
- **`DISABLE_HEADLESS`**: (Optional) Set to `true` to run the browser in visible mode.
  - Default: `false` (browser runs in headless mode).

## Communication Modes

The server supports three communication modes:

1.  **stdio (Default)**: Communicates via standard input/output.
    -   Perfect for direct integration with LLM tools that manage processes.
    -   Ideal for command-line usage and scripting.
    -   No HTTP server is started. This is the default mode.
2.  **SSE mode**: Communicates via Server-Sent Events over HTTP.
    -   Enable by setting `TRANSPORT_TYPE=sse` in your environment.
    -   Starts an HTTP server on the specified `PORT` (default: 3001).
    -   Use when you need to connect to the tool over a network.
    -   Connect to: `http://localhost:3001/sse`
3.  **HTTP mode**: Communicates via Streamable HTTP transport with session management.
    -   Enable by setting `TRANSPORT_TYPE=http` in your environment.
    -   Starts an HTTP server on the specified `PORT` (default: 3001).
    -   Supports full session management and resumable connections.
    -   Connect to: `http://localhost:3001/mcp`

## Tool Usage (MCP Invocation)

The server provides a `scrape-webpage` tool.

**Tool Parameters:**

- `url` (string, required): The URL of the webpage to scrape.
- `autoInteract` (boolean, optional, default: true): Whether to automatically handle interactive elements.
- `waitForNetworkIdle` (boolean, optional, default: true): Whether to wait for network to be idle before processing.

**Response Format:**

The tool returns its result in a structured format:

- **`content`**: An array containing a single text object with the raw markdown of the scraped webpage.
- **`metadata`**: Contains additional information:
  - `message`: Status message.
  - `success`: Boolean indicating success.
  - `contentSize`: Size of the content in characters (on success).

*Example Success Response:*
```json
{
  "content": [
    {
      "type": "text",
      "text": "# Page Title\n\nThis is the content..."
    }
  ],
  "metadata": {
    "message": "Scraping successful",
    "success": true,
    "contentSize": 8734
  }
}
```

*Example Error Response:*
```json
{
  "content": [
    {
      "type": "text",
      "text": ""
    }
  ],
  "metadata": {
    "message": "Error scraping webpage: Failed to load the URL",
    "success": false
  }
}
```

## How It Works

### Simple Interaction
The system uses a simple rule-based approach to handle common website interruptions. It searches for buttons containing keywords like "Accept", "Agree", or "Continue" and clicks them to dismiss pop-ups like cookie banners.

### Content Extraction
After interactions, Mozilla's Readability extracts the main content, which is then sanitized and converted to Markdown using Turndown with custom rules for code blocks and tables.

## Installation & Development (for Modifying the Code)

If you wish to contribute, modify the server, or run a local development version:

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/morrain/zhihuMcpServer.git
    cd zhihuMcpServer
    ```
2.  **Install Dependencies:**
    ```bash
    npm install
    ```
3.  **Build the Project:**
    ```bash
    npm run build
    ```
4.  **Run for Development:**
    ```bash
    npm start
    ```
    Or, for automatic rebuilding on changes:
    ```bash
    npm run dev
    ```

## Customization (for Developers)

You can modify the behavior of the scraper by editing:
- `src/ai/page-interactions.ts`: Add new keywords or logic for handling different types of pop-ups.
- `src/scrapers/webpage-scraper.ts` (`visitWebPage` function): Change Puppeteer options.
- `src/utils/markdown-formatters.ts`: Adjust Turndown rules for Markdown conversion.

## Dependencies
Key dependencies include:
- `@modelcontextprotocol/sdk`
- `puppeteer`, `puppeteer-extra`
- `@mozilla/readability`, `jsdom`
- `turndown`, `sanitize-html`
- `express` (for SSE/HTTP modes)
- `zod`
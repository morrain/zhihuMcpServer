import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools.js';
import { setupTransport } from './transports.js';

// Server information
const serverName = "web-scraper-mcp-server";
const serverVersion = "1.0.0";

/**
 * Creates and initializes the MCP server
 * @returns The initialized MCP server instance
 */
export function createMcpServer(): McpServer {
  // Create the MCP server instance
  const server = new McpServer({
    name: serverName,
    version: serverVersion,
    capabilities: {},
  });

  // Register available tools
  registerTools(server);

  // Configure transport
  setupTransport(server, serverName, serverVersion);

  return server;
}
import express, { Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { config } from '../config.js';

/**
 * Sets up the appropriate transport for the MCP server
 * @param server The MCP server instance
 * @param serverName Server name for logging
 * @param serverVersion Server version for logging
 */
export function setupTransport(server: McpServer, serverName: string, serverVersion: string): void {
  switch (config.transportType) {
    case 'stdio':
      setupStdioTransport(server, serverName, serverVersion);
      break;
    case 'sse':
      setupSSETransport(server, serverName, serverVersion);
      break;
    case 'http':
      setupHTTPTransport(server, serverName, serverVersion);
      break;
    default:
      console.error(`Unknown transport type: ${config.transportType}. Use 'stdio', 'sse', or 'http'.`);
      process.exit(1);
  }
}

/**
 * Sets up an SSE transport over HTTP
 * @param server The MCP server instance
 * @param serverName Server name for logging
 * @param serverVersion Server version for logging
 */
function setupSSETransport(server: McpServer, serverName: string, serverVersion: string): void {
  // Setup Express server for SSE mode
  const app = express();
  
  // to support multiple simultaneous connections we have a lookup object from
  // sessionId to transport
  const transports: {[sessionId: string]: SSEServerTransport} = {};
  
  app.get("/sse", async (_: Request, res: Response) => {
    console.error('Received SSE connection request');
    const transport = new SSEServerTransport('/messages', res);
    transports[transport.sessionId] = transport;
    res.on("close", () => {
      console.error(`SSE connection closed for session ${transport.sessionId}`);
      delete transports[transport.sessionId];
    });
    await server.connect(transport);
  });
  
  app.post("/messages", async (req: Request, res: Response) => {
    console.error('Received SSE message POST request');
    const sessionId = req.query.sessionId as string;
    const transport = transports[sessionId];
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      console.error(`No SSE transport found for sessionId: ${sessionId}`);
      res.status(400).send('No transport found for sessionId');
    }
  });
  
  const webserver = app.listen(config.serverPort, () => {
    console.error(`${serverName} v${serverVersion} is running on port ${config.serverPort} with SSE transport`);
    console.error(`Connect to: http://localhost:${config.serverPort}/sse`);
  });
  
  webserver.keepAliveTimeout = 3000;
  
  // Keep the process alive
  webserver.on('error', (error) => {
    console.error('HTTP server error:', error);
  });
  
  // Handle server shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down SSE server...');
    
    // Close all active SSE transports
    for (const [sessionId, transport] of Object.entries(transports)) {
      try {
        console.error(`Closing SSE transport for session ${sessionId}`);
        // SSE transports typically don't have a close method, cleanup happens via res.on("close")
        delete transports[sessionId];
      } catch (error) {
        console.error(`Error cleaning up SSE transport for session ${sessionId}:`, error);
      }
    }

    console.error('SSE server shutdown complete');
    process.exit(0);
  });
  
  // Prevent the process from exiting
  process.stdin.resume();
}

/**
 * Sets up an HTTP transport for web-based communication
 * @param server The MCP server instance
 * @param serverName Server name for logging
 * @param serverVersion Server version for logging
 */
function setupHTTPTransport(server: McpServer, serverName: string, serverVersion: string): void {
  console.error("Starting MCP server with HTTP transport...");
  
  const app = express();
  
  const transports: Map<string, StreamableHTTPServerTransport> = new Map<string, StreamableHTTPServerTransport>();
  
  // Handle POST requests for MCP initialization and method calls
  app.post('/mcp', async (req: Request, res: Response) => {
    console.error('Received MCP POST request');
    try {
      // Check for existing session ID
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports.has(sessionId)) {
        // Reuse existing transport
        transport = transports.get(sessionId)!;
      } else if (!sessionId) {
        // New initialization request
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sessionId: string) => {
            // Store the transport by session ID when session is initialized
            console.error(`Session initialized with ID: ${sessionId}`);
            transports.set(sessionId, transport);
          }
        });

        // Set up onclose handler to clean up transport when closed
        transport.onclose = async () => {
          const sid = transport.sessionId;
          if (sid && transports.has(sid)) {
            console.error(`Transport closed for session ${sid}, removing from transports map`);
            transports.delete(sid);
          }
        };

        // Connect the transport to the MCP server BEFORE handling the request
        await server.connect(transport);

        await transport.handleRequest(req, res);
        return; // Already handled
      } else {
        // Invalid request - no session ID or not initialization request
        res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Bad Request: No valid session ID provided',
          },
          id: req?.body?.id,
        });
        return;
      }

      // Handle the request with existing transport
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling MCP request:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: req?.body?.id,
        });
      }
    }
  });

  // Handle GET requests for SSE streams
  app.get('/mcp', async (req: Request, res: Response) => {
    console.error('Received MCP GET request');
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: req?.body?.id,
      });
      return;
    }

    // Check for Last-Event-ID header for resumability
    const lastEventId = req.headers['last-event-id'] as string | undefined;
    if (lastEventId) {
      console.error(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
    } else {
      console.error(`Establishing new SSE stream for session ${sessionId}`);
    }

    const transport = transports.get(sessionId);
    await transport!.handleRequest(req, res);
  });

  // Handle DELETE requests for session termination
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports.has(sessionId)) {
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: req?.body?.id,
      });
      return;
    }

    console.error(`Received session termination request for session ${sessionId}`);

    try {
      const transport = transports.get(sessionId);
      await transport!.handleRequest(req, res);
    } catch (error) {
      console.error('Error handling session termination:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Error handling session termination',
          },
          id: req?.body?.id,
        });
      }
    }
  });
  
  const webserver = app.listen(config.serverPort, () => {
    console.error(`${serverName} v${serverVersion} is running on port ${config.serverPort} with HTTP transport`);
    console.error(`Connect to: http://localhost:${config.serverPort}/mcp`);
  });
  
  webserver.keepAliveTimeout = 3000;
  
  // Keep the process alive
  webserver.on('error', (error) => {
    console.error('HTTP server error:', error);
  });
  
  // Handle server shutdown
  process.on('SIGINT', async () => {
    console.error('Shutting down server...');

    // Close all active transports to properly clean up resources
    for (const [sessionId, transport] of transports) {
      try {
        console.error(`Closing transport for session ${sessionId}`);
        await transport.close();
        transports.delete(sessionId);
      } catch (error) {
        console.error(`Error closing transport for session ${sessionId}:`, error);
      }
    }

    console.error('Server shutdown complete');
    process.exit(0);
  });
  
  // Prevent the process from exiting
  process.stdin.resume();
}

/**
 * Sets up a stdio transport for command-line usage
 * @param server The MCP server instance
 * @param serverName Server name for logging
 * @param serverVersion Server version for logging
 */
function setupStdioTransport(server: McpServer, serverName: string, serverVersion: string): void {
  // Use Stdio transport (default mode)
  const stdioTransport = new StdioServerTransport();
  
  console.log(`${serverName} v${serverVersion} starting in stdio mode`);
  
  // Connect the transport to the server
  server.connect(stdioTransport).catch((error) => {
    console.error("Error connecting transport:", error);
    process.exit(1);
  });
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});

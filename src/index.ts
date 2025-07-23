#!/usr/bin/env node
import dotenv from 'dotenv';

// Load environment variables before importing other modules
dotenv.config();

// Import the main server module
import { createMcpServer } from './server/mcp-server.js';
import { closeBrowser } from './utils/browser-manager.js';

// Start the server
createMcpServer();

// Ensure browser is closed on process exit
process.on('SIGINT', async () => {
  console.log('Received SIGINT. Closing browser and exiting...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM. Closing browser and exiting...');
  await closeBrowser();
  process.exit(0);
});

process.on('exit', async (code) => {
  console.log(`Exiting with code: ${code}`);
  // In case SIGINT/SIGTERM didn't trigger, ensure browser is closed
  await closeBrowser();
});
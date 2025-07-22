#!/usr/bin/env node
import dotenv from 'dotenv';

// Load environment variables before importing other modules
dotenv.config();

// Import the main server module
import { createMcpServer } from './server/mcp-server.js';

// Start the server
createMcpServer();
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration & Environment Check
export const config = {
  serverPort: parseInt(process.env.PORT || '3001', 10),
  useSSE: process.env.USE_SSE === 'true',
  transportType: process.env.TRANSPORT_TYPE || (process.env.USE_SSE === 'true' ? 'sse' : 'stdio'), // 'stdio', 'sse', or 'http'
  headless: process.env.DISABLE_HEADLESS !== 'true', // Default to headless mode unless explicitly disabled
  cookie: process.env.COOKIE, // Add cookie configuration
};

// Validate transport type
if (!['stdio', 'sse', 'http'].includes(config.transportType)) {
  console.error(`Error: Invalid TRANSPORT_TYPE "${config.transportType}". Must be 'stdio', 'sse', or 'http'.`);
  process.exit(1);
}

console.log(`Transport type: ${config.transportType}`);
console.log(`Browser mode: ${config.headless ? 'headless' : 'visible'}`);

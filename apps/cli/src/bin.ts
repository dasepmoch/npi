#!/usr/bin/env node
import { createApp } from './app.js';

// Graceful shutdown — restore terminal state on interrupt
process.on('SIGINT', () => {
  // Show cursor again (ora hides it)
  process.stdout.write('\x1B[?25h');
  console.log('');
  process.exit(130);
});

process.on('SIGTERM', () => {
  process.stdout.write('\x1B[?25h');
  process.exit(143);
});

// Handle unhandled rejections gracefully
process.on('unhandledRejection', (error) => {
  if (error instanceof Error) {
    console.error(`\n  Error: ${error.message}\n`);
  }
  process.exit(1);
});

const app = createApp();
app.parse();

/**
 * Main CLI entry point for scraping documentation
 * 
 * Usage: pnpm scrape <source>
 * Example: pnpm scrape nextjs
 */

import { spawn } from 'child_process';
import path from 'path';

const source = process.argv[2];

if (!source) {
  console.error('❌ Error: No source specified');
  console.log('\nUsage: pnpm scrape <source>');
  console.log('\nAvailable sources:');
  console.log('  - nextjs');
  console.log('  - react');
  console.log('  - typescript');
  process.exit(1);
}

console.log(`📚 Scraping ${source} documentation...`);

// Run scrape-docs.ts with the source argument
const scriptPath = path.join(__dirname, 'sources', 'scrape-docs.ts');
const child = spawn('tsx', [scriptPath, source], {
  stdio: 'inherit',
  cwd: process.cwd()
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

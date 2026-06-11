#!/usr/bin/env node
/**
 * Parse a Figma URL and print JSON (fileKey, fileName, url, nodeId).
 *
 * Usage:
 *   node scripts/parse-figma-url.mjs "https://www.figma.com/design/…"
 *   npm run parse-url -- "https://…"
 */

import { parseFigmaUrl } from './lib/parse-figma-url.mjs';

const url = process.argv[2];
if (!url || url === '--help' || url === '-h') {
  console.log(`Usage: node scripts/parse-figma-url.mjs "<figma-url>"`);
  process.exit(url ? 0 : 1);
}

try {
  const result = parseFigmaUrl(url);
  if (result.warnings?.length) {
    for (const w of result.warnings) console.warn(`⚠️  ${w}`);
  }
  console.log(JSON.stringify(result, null, 2));
} catch (err) {
  console.error(`❌  ${err.message}`);
  process.exit(1);
}

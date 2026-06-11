#!/usr/bin/env node
/**
 * Report config status: not_initialized | incomplete | invalid | ok
 *
 * Usage:
 *   npm run config
 *   npm run config -- --json
 */

import { getConfigStatus, CONFIG_PATH } from './lib/load-config.mjs';

const json = process.argv.includes('--json');
const { status, config, reason } = getConfigStatus();

if (json) {
  console.log(JSON.stringify({ status, reason: reason ?? null, config }, null, 2));
  process.exit(status === 'ok' ? 0 : status === 'incomplete' ? 2 : 1);
}

switch (status) {
  case 'ok':
    console.log(`✅  ${CONFIG_PATH}`);
    console.log(`    fileKey:     ${config.fileKey}`);
    console.log(`    fileName:    ${config.fileName}`);
    console.log(`    collections: ${config.collections.join(', ')}`);
    break;
  case 'incomplete':
    console.log(`⚠️  ${CONFIG_PATH} — incomplete`);
    console.log(`    fileKey:     ${config.fileKey}`);
    console.log(`    fileName:    ${config.fileName}`);
    console.log(`    ${reason}`);
    console.log('');
    console.log('Discover collections via Figma MCP, then:');
    console.log('  npm run init -- --merge --collections Primitives Semantic …');
    process.exit(2);
  case 'not_initialized':
    console.log(`⭕  Not initialized — ${CONFIG_PATH} missing or empty`);
    console.log('');
    console.log('Paste your Figma file URL in Cursor chat and ask:');
    console.log('  "Initialize figma-integration"');
    process.exit(1);
  case 'invalid':
    console.log(`❌  Invalid config — ${reason}`);
    process.exit(1);
}

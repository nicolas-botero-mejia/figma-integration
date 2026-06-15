#!/usr/bin/env node
/**
 * Report config status: not_initialized | incomplete | invalid | ok
 *
 * Usage:
 *   npm run config
 *   npm run config -- --json
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getConfigStatus, CONFIG_PATH } from './lib/load-config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function readVersion() {
  const path = join(ROOT, 'VERSION');
  if (!existsSync(path)) return 'unknown';
  return readFileSync(path, 'utf8').trim();
}

const json = process.argv.includes('--json');
const { status, config, reason } = getConfigStatus();

if (json) {
  console.log(JSON.stringify({ status, reason: reason ?? null, toolingVersion: readVersion(), config }, null, 2));
  process.exit(status === 'ok' ? 0 : status === 'incomplete' ? 2 : 1);
}

switch (status) {
  case 'ok':
    console.log(`✅  ${CONFIG_PATH}`);
    console.log(`    tooling:     v${readVersion()}`);
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
    console.log('Add collection names from Figma → Local variables, then:');
    console.log('  npm run init -- --merge --collections …');
    process.exit(2);
  case 'not_initialized':
    console.log(`⭕  Not initialized — ${CONFIG_PATH} missing or empty`);
    console.log('');
    console.log('  npm run init -- --url "https://…"');
    console.log('');
    console.log('Collections default from tokens/ scaffold. See README.md');
    process.exit(1);
  case 'invalid':
    console.log(`❌  Invalid config — ${reason}`);
    process.exit(1);
}

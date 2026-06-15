#!/usr/bin/env node
/**
 * Write config/figma.json from a Figma URL + discovered collections.
 *
 * Usage:
 *   npm run init -- --url "https://www.figma.com/design/…"
 *   npm run init -- --url "https://…" --collections Primitives Semantic Components
 *   npm run init -- --url "https://…" --collections "Primitives,Semantic,Components"
 *   npm run init -- --merge --collections Density Layout   # update collections only
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { parseFigmaUrl, parseCollectionsArg } from './lib/parse-figma-url.mjs';
import { readDefaults, readLocalConfig, mergeConfig, CONFIG_PATH, getConfigStatus, ROOT } from './lib/load-config.mjs';
import { discoverCollectionsFromTokens } from './lib/discover-collections.mjs';

const TOKENS_DIR = join(ROOT, 'tokens');

function usage() {
  console.log(`
Usage: npm run init -- --url "<figma-url>" [--collections <names…>] [--merge]

  --url           Figma design/file URL (required unless --merge with existing config)
  --collections   Variable collection names (optional — default: from tokens/ scaffold folders)
  --merge         Merge into existing config/figma.json instead of replacing
  --force         Overwrite existing config/figma.json

Examples:
  npm run parse-url -- "https://www.figma.com/design/AbCdEf123456/my-design-system"
  npm run init -- --url "https://…"
  npm run init -- --url "https://…" --collections Primitives Semantic Components Density Layout
`);
}

function parseArgs(argv) {
  const opts = { merge: false, force: false, collections: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--url') opts.url = argv[++i];
    else if (a === '--collections') opts.collections.push(...parseCollectionsArg([argv[++i]]));
    else if (a === '--merge') opts.merge = true;
    else if (a === '--force') opts.force = true;
    else if (a.startsWith('--collections=')) opts.collections.push(...parseCollectionsArg([a.slice(14)]));
    else if (!a.startsWith('--')) {
      if (!opts.url && a.includes('figma.com')) opts.url = a;
      else opts.collections.push(...parseCollectionsArg([a]));
    }
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  usage();
  process.exit(0);
}

const existing = readLocalConfig();

if (existing && !opts.force && !opts.merge) {
  console.error('❌  config/figma.json already exists.');
  console.error('    Use --merge to update collections, or --force to replace.');
  process.exit(1);
}

let parsed = null;
if (opts.url) {
  try {
    parsed = parseFigmaUrl(opts.url);
  } catch (err) {
    console.error(`❌  ${err.message}`);
    process.exit(1);
  }
} else if (!existing?.fileKey) {
  console.error('❌  --url is required when config/figma.json does not exist yet.');
  usage();
  process.exit(1);
}

const defaults = readDefaults();
const base = opts.merge && existing ? mergeConfig(defaults, existing) : { ...defaults };

let collections = opts.collections;
if (!collections.length) {
  collections = discoverCollectionsFromTokens(TOKENS_DIR);
  if (collections.length) {
    console.log(`ℹ️  Collections from tokens/ scaffold: ${collections.join(', ')}`);
  }
}

const local = {
  ...(parsed
    ? {
        fileKey: parsed.fileKey,
        fileName: parsed.fileName,
        url: parsed.url,
        ...(parsed.nodeId ? { nodeId: parsed.nodeId } : {}),
      }
    : {}),
  ...(collections.length ? { collections } : {}),
  initializedAt: new Date().toISOString(),
};

const config = mergeConfig(base, local);

writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');

const { status, reason } = getConfigStatus();

console.log(`📝  Wrote ${CONFIG_PATH}`);
if (parsed) {
  console.log(`    fileKey:     ${parsed.fileKey}`);
  console.log(`    fileName:    ${parsed.fileName}`);
}
if (config.collections?.length) {
  console.log(`    collections: ${config.collections.join(', ')}`);
}

if (status === 'ok') {
  console.log('\n✅  Initialization complete — run npm run config');
} else if (status === 'incomplete') {
  console.log('\n⚠️  Partial init — collections still needed');
  console.log(`    ${reason}`);
  console.log('    Default: derived from tokens/ folders (see README.md)');
  console.log('    Or override: npm run init -- --merge --collections …');
} else {
  console.log(`\n⚠️  Status: ${status}${reason ? ` — ${reason}` : ''}`);
}

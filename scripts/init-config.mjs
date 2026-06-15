#!/usr/bin/env node
/**
 * Initialize figma-integration: environment (MCP + skills) then project config.
 *
 * Usage:
 *   npm run init -- --url "https://www.figma.com/design/…"
 *   npm run init:env                              # MCP + skills only
 *   npm run init -- --url "…" --skip-env          # config only
 *   npm run init -- --env-only --editor copilot   # env only
 */

import { writeFileSync } from 'fs';
import { join } from 'path';
import { parseFigmaUrl, parseCollectionsArg } from './lib/parse-figma-url.mjs';
import { readDefaults, readLocalConfig, mergeConfig, CONFIG_PATH, getConfigStatus, ROOT } from './lib/load-config.mjs';
import { discoverCollectionsFromTokens } from './lib/discover-collections.mjs';
import { runInitEnv } from './init-env.mjs';

const TOKENS_DIR = join(ROOT, 'tokens');

function usage() {
  console.log(`
Usage: npm run init -- [options]

  --url           Figma design/file URL (required for new project config)
  --collections   Variable collection names (default: from tokens/ scaffold)
  --editor        copilot | cursor | both (default: both) — skills + MCP targets
  --merge         Merge into existing config/figma.json
  --force         Overwrite existing config/figma.json
  --skip-env      Skip MCP wiring and skill install (config only)
  --env-only      Wire MCP + install skills; do not write config/figma.json

Environment step (default on): syncs .mcp.json and hard-installs Figma plugin skills
+ required southleft skills. Run npm run doctor to verify files on disk.

Examples:
  npm run init -- --url "https://www.figma.com/design/AbCdEf123456/my-design-system"
  npm run init:env -- --editor copilot
  npm run init -- --url "https://…" --skip-env
`);
}

function parseArgs(argv) {
  const opts = {
    merge: false,
    force: false,
    skipEnv: false,
    envOnly: false,
    editor: 'both',
    collections: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--url') opts.url = argv[++i];
    else if (a === '--editor') opts.editor = argv[++i];
    else if (a === '--collections') opts.collections.push(...parseCollectionsArg([argv[++i]]));
    else if (a === '--merge') opts.merge = true;
    else if (a === '--force') opts.force = true;
    else if (a === '--skip-env') opts.skipEnv = true;
    else if (a === '--env-only') opts.envOnly = true;
    else if (a.startsWith('--collections=')) opts.collections.push(...parseCollectionsArg([a.slice(14)]));
    else if (!a.startsWith('--')) {
      if (!opts.url && a.includes('figma.com')) opts.url = a;
      else opts.collections.push(...parseCollectionsArg([a]));
    }
  }
  if (!['copilot', 'cursor', 'both'].includes(opts.editor)) {
    console.error(`❌  Invalid --editor "${opts.editor}"`);
    process.exit(1);
  }
  return opts;
}

const opts = parseArgs(process.argv.slice(2));
if (opts.help) {
  usage();
  process.exit(0);
}

if (!opts.skipEnv) {
  try {
    runInitEnv({ editor: opts.editor });
  } catch (err) {
    console.error(`❌  Environment setup failed: ${err.message}`);
    process.exit(1);
  }
  console.log('');
}

if (opts.envOnly) {
  console.log('Run npm run doctor to verify, then npm run init -- --url "https://…" --skip-env if config already exists.');
  process.exit(0);
}

const existing = readLocalConfig();

if (existing && !opts.force && !opts.merge) {
  console.error('❌  config/figma.json already exists.');
  console.error('    Use --merge to update collections, --force to replace, or --env-only for skills/MCP only.');
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
  editor: opts.editor,
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
  console.log('\n✅  Project config complete — run npm run config');
} else if (status === 'incomplete') {
  console.log('\n⚠️  Partial init — collections still needed');
  console.log(`    ${reason}`);
  console.log('    Default: derived from tokens/ folders (see README.md)');
  console.log('    Or override: npm run init -- --merge --collections …');
} else {
  console.log(`\n⚠️  Status: ${status}${reason ? ` — ${reason}` : ''}`);
}

console.log('\nNext (in your editor):');
console.log('  1. Activate Figma plugin + complete OAuth (Copilot app: `copilot` CLI)');
console.log('  2. MCP connection test — scripts/mcp-connection-test.js via use_figma');
console.log('  3. After export: npm run scaffold-components');

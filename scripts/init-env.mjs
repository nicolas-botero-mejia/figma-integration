#!/usr/bin/env node
/**
 * Wire MCP config + hard-install plugin and southleft skills.
 *
 * Usage:
 *   npm run init:env
 *   npm run init:env -- --editor copilot
 *   npm run init:env -- --editor cursor
 *   npm run init:env -- --editor both
 */

import { join } from 'path';
import { installSkills, skillTargetsForEditor } from './lib/install-skills.mjs';
import { wireMcp } from './lib/wire-mcp.mjs';
import { ROOT } from './lib/root.mjs';

function parseArgs(argv) {
  let editor = 'both';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--help' || argv[i] === '-h') return { help: true };
    if (argv[i] === '--editor') editor = argv[++i];
  }
  if (!['copilot', 'cursor', 'both'].includes(editor)) {
    console.error(`❌  Invalid --editor "${editor}" (copilot | cursor | both)`);
    process.exit(1);
  }
  return { editor };
}

function usage() {
  console.log(`
Usage: npm run init:env [-- --editor copilot|cursor|both]

  Syncs MCP config from .mcp.json and hard-installs:
    • Figma plugin skills (figma/mcp-server-guide)
    • Required southleft skills (figma-console-mcp-skills)

  Default editor: both (.github/skills + .cursor/skills)
`);
}

export function runInitEnv({ editor = 'both' } = {}) {
  console.log('🔌  Wiring MCP config…');
  const mcpPaths = wireMcp(editor);
  for (const p of mcpPaths) {
    console.log(`    ${p.replace(ROOT + '/', '')}`);
  }

  const skillDirs = skillTargetsForEditor(editor).map((rel) => join(ROOT, rel));
  for (const dir of skillDirs) {
    console.log(`\n📦  Installing skills → ${dir.replace(ROOT + '/', '')}`);
    const { plugin, southleft } = installSkills(dir);
    console.log(`    plugin (${plugin.length}): ${plugin.join(', ')}`);
    console.log(`    southleft (${southleft.length}): ${southleft.join(', ')}`);
  }

  console.log('\n✅  Environment wired (MCP config + skills)');
  console.log('\nNext (manual in your editor):');
  console.log('  1. Activate Figma plugin (Cursor: /add-plugin figma · Copilot: .github/plugin/plugin.json)');
  console.log('  2. Complete Figma OAuth (Copilot app: run `copilot` in terminal)');
  console.log('  3. npm run init -- --url "https://www.figma.com/design/…"');
  console.log('  4. MCP connection test — scripts/mcp-connection-test.js via use_figma');
}

const isMain = process.argv[1]?.endsWith('init-env.mjs');
if (isMain) {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    usage();
    process.exit(0);
  }
  try {
    runInitEnv(opts);
  } catch (err) {
    console.error(`❌  ${err.message}`);
    process.exit(1);
  }
}

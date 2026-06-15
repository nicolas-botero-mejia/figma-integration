#!/usr/bin/env node
/**
 * Create tokens/components/{prefix}.json scaffolds from Figma export.
 * One file per component group; prefixes with * are ignored.
 *
 * Usage:
 *   npm run scaffold-components
 *   npm run scaffold-components -- --input tmp/figma-export/master-vars.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import { discoverComponentPrefixes } from './lib/component-routing.mjs';
import { ROOT } from './lib/root.mjs';

const COMPONENTS_DIR = join(ROOT, 'tokens/components');
const DEFAULT_INPUT = join(ROOT, 'tmp/figma-export/master-vars.json');

/** Legacy bundled component scaffolds (replaced by one-file-per-prefix). */
const LEGACY_SCAFFOLDS = new Set([
  'button.json',
  'data.json',
  'feedback.json',
  'forms.json',
  'input.json',
  'layout.json',
  'navigation.json',
  'overlays.json',
]);

function parseArgs(argv) {
  let input = DEFAULT_INPUT;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') {
      input = argv[++i].startsWith('/') ? argv[i] : join(ROOT, argv[i]);
    }
  }
  return { input };
}

function removeLegacyBundledScaffolds() {
  if (!existsSync(COMPONENTS_DIR)) return [];
  const removed = [];
  for (const name of readdirSync(COMPONENTS_DIR)) {
    if (!LEGACY_SCAFFOLDS.has(name)) continue;
    const path = join(COMPONENTS_DIR, name);
    try {
      if (statSync(path).isFile()) {
        unlinkSync(path);
        removed.push(name);
      }
    } catch {
      /* ignore */
    }
  }
  return removed;
}

function main() {
  const { input } = parseArgs(process.argv.slice(2));

  if (!existsSync(input)) {
    console.error('❌  Missing', input);
    console.error('    Export variables first, then assemble master-vars.json.');
    process.exit(1);
  }

  const data = JSON.parse(readFileSync(input, 'utf8'));
  const prefixes = discoverComponentPrefixes(data.Components);

  if (!prefixes.length) {
    console.warn('⚠️  No Components prefixes found in export.');
    process.exit(0);
  }

  mkdirSync(COMPONENTS_DIR, { recursive: true });
  const removed = removeLegacyBundledScaffolds();
  if (removed.length) {
    console.log(`ℹ️  Removed legacy bundled scaffolds: ${removed.join(', ')}`);
  }

  let created = 0;
  for (const prefix of prefixes) {
    const path = join(COMPONENTS_DIR, `${prefix}.json`);
    if (!existsSync(path)) {
      writeFileSync(path, '{}\n', 'utf8');
      created++;
      console.log(`  + components/${prefix}.json`);
    }
  }

  console.log(`\n✅  ${prefixes.length} component prefix(es); ${created} new scaffold(s)`);
}

main();

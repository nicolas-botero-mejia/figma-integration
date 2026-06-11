#!/usr/bin/env node
/**
 * Assemble per-collection extraction chunks into a single figma-vars.json
 * Usage: node scripts/assemble-figma-export.mjs <label> <outfile>
 *   label: master | copy
 * Example: node scripts/assemble-figma-export.mjs copy tmp/figma-export/copy-vars.json
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { loadConfig } from './lib/load-config.mjs';

const config = loadConfig();

const ROOT = new URL('..', import.meta.url).pathname;
const label = process.argv[2];
const outRel = process.argv[3];
if (!label || !outRel) {
  console.error('Usage: node scripts/assemble-figma-export.mjs <master|copy> <outfile>');
  process.exit(1);
}

const chunkDir = join(ROOT, 'tmp/figma-export/chunks', label);
const ORDER = config.collections;
if (!ORDER?.length) {
  console.error('❌  No collections in config/figma.json — run npm run init -- --collections …');
  process.exit(1);
}

const output = {};
let total = 0;

for (const col of ORDER) {
  const single = join(chunkDir, `${col}.json`);
  const a = join(chunkDir, `${col}-a.json`);
  const b = join(chunkDir, `${col}-b.json`);

  let vars = [];
  let modes = [];
  let defaultMode = '';

  if (existsSync(single)) {
    const data = JSON.parse(readFileSync(single, 'utf8'));
    vars = data.vars;
    modes = data.modes;
    defaultMode = data.defaultMode;
  } else if (existsSync(a) && existsSync(b)) {
    const da = JSON.parse(readFileSync(a, 'utf8'));
    const db = JSON.parse(readFileSync(b, 'utf8'));
    vars = [...da.vars, ...db.vars];
    modes = da.modes;
    defaultMode = da.defaultMode;
  } else {
    console.error(`❌ Missing chunks for ${col} in ${chunkDir}`);
    process.exit(1);
  }

  output[col] = { modes, defaultMode, vars };
  total += vars.length;
  console.log(`  ${col.padEnd(12)} ${vars.length} vars`);
}

const outPath = join(ROOT, outRel);
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\n✅ ${outPath} — ${total} variables`);

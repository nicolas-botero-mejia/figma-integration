#!/usr/bin/env node
/**
 * compare-token-trees.mjs
 *
 * Structural roundtrip check: compares extracted DTCG (tmp/tokens/) against
 * source DTCG (tokens/). Uses the same Figma-eligibility rules as parity-check.mjs.
 *
 * Usage:
 *   node scripts/compare-token-trees.mjs
 *   node scripts/compare-token-trees.mjs --source tokens --extracted tmp/tokens
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

function parseArgs(argv) {
  const opts = {
    source: join(ROOT, 'tokens'),
    extracted: join(ROOT, 'tmp/tokens'),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source') opts.source = argv[++i].startsWith('/') ? argv[i] : join(ROOT, argv[i]);
    if (argv[i] === '--extracted') opts.extracted = argv[++i].startsWith('/') ? argv[i] : join(ROOT, argv[i]);
  }
  return opts;
}

const SKIP_KEYS = new Set(['$description', '$extensions', '$figmaExclude']);
const CSS_ONLY_TYPES = new Set(['cubicBezier', 'transition', 'shadow']);
const CSS_ONLY_FILES = new Set([
  'primitives/motion-easing.json',
  'primitives/shadow.json',
  'semantic/typography.json',
]);

function normHex(h) {
  if (typeof h !== 'string') return h;
  return h.toLowerCase();
}

function valuesMatch(a, b) {
  if (typeof a === 'string' && a.startsWith('{') && typeof b === 'string' && b.startsWith('{')) {
    return a === b;
  }
  if (typeof a === 'string' && a.startsWith('#') && typeof b === 'string' && b.startsWith('#')) {
    return normHex(a) === normHex(b);
  }
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-4;
  }
  return a === b;
}

function isExcluded(node) {
  return node['$figmaExclude'] === true;
}

function flattenTokens(obj, pathParts, out) {
  if (isExcluded(obj)) return;

  if ('$value' in obj) {
    const type = obj['$type'];
    if (!type || CSS_ONLY_TYPES.has(type)) return;
    out.set(pathParts.join('/'), { type, value: obj['$value'], modes: null });
    return;
  }

  if ('$modes' in obj) {
    const type = obj['$type'];
    if (!type || CSS_ONLY_TYPES.has(type)) return;
    out.set(pathParts.join('/'), { type, value: null, modes: obj['$modes'] });
    return;
  }

  for (const [key, child] of Object.entries(obj)) {
    if (SKIP_KEYS.has(key) || key.startsWith('$')) continue;
    if (child && typeof child === 'object') {
      flattenTokens(child, [...pathParts, key], out);
    }
  }
}

function findJsonFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) findJsonFiles(full, files);
    else if (entry.endsWith('.json')) files.push(full);
  }
  return files;
}

function loadTree(dir) {
  const map = new Map();
  for (const file of findJsonFiles(dir)) {
    const rel = relative(dir, file);
    if (CSS_ONLY_FILES.has(rel)) continue;
    const raw = JSON.parse(readFileSync(file, 'utf8'));
    if (isExcluded(raw)) continue;
    flattenTokens(raw, [], map);
  }
  return map;
}

const { source, extracted } = parseArgs(process.argv.slice(2));

if (!existsSync(extracted)) {
  console.error(`❌ Missing extracted tree: ${extracted}`);
  console.error('   Run: node scripts/figma-export-to-dtcg.mjs');
  process.exit(1);
}

const sourceMap = loadTree(source);
const extractedMap = loadTree(extracted);

const matches = [];
const missing = [];
const mismatches = [];
const typeMismatches = [];

for (const [path, src] of sourceMap) {
  const ext = extractedMap.get(path);
  if (!ext) {
    missing.push({ path, type: src.type });
    continue;
  }

  if (src.type !== ext.type) {
    typeMismatches.push({ path, source: src.type, extracted: ext.type });
    continue;
  }

  if (src.modes) {
    let ok = true;
    for (const [mode, val] of Object.entries(src.modes)) {
      const extVal = ext.modes?.[mode];
      if (!valuesMatch(val, extVal)) {
        mismatches.push({ path, mode, source: val, extracted: extVal });
        ok = false;
      }
    }
    if (ok) matches.push(path);
  } else if (!valuesMatch(src.value, ext.value)) {
    mismatches.push({ path, source: src.value, extracted: ext.value });
  } else {
    matches.push(path);
  }
}

const extras = [];
for (const path of extractedMap.keys()) {
  if (!sourceMap.has(path)) extras.push(path);
}

const total = sourceMap.size;
const pct = total ? Math.round(matches.length / total * 100) : 0;

console.log('\n' + '═'.repeat(70));
console.log('  STRUCTURAL ROUNDTRIP — tokens/ ↔ tmp/tokens/');
console.log('═'.repeat(70));
console.log(`\n  Source tokens (Figma-eligible):   ${total}`);
console.log(`  Extracted tokens:                 ${extractedMap.size}`);
console.log(`\n  ✅  Matches:                      ${matches.length}`);
console.log(`  ❌  Missing in extracted:          ${missing.length}`);
console.log(`  🔴  Value mismatches:              ${mismatches.length}`);
console.log(`  ⚠️   Type mismatches:               ${typeMismatches.length}`);
console.log(`  ➕  Extra in extracted:            ${extras.length}`);

if (missing.length) {
  console.log('\n─── MISSING IN EXTRACTED (' + missing.length + ') ─────────────────────────────');
  for (const m of missing.slice(0, 20)) console.log(`  • ${m.path}  [${m.type}]`);
  if (missing.length > 20) console.log(`  … and ${missing.length - 20} more`);
}

if (mismatches.length) {
  console.log('\n─── VALUE MISMATCHES (' + mismatches.length + ') ──────────────────────────────────');
  for (const m of mismatches.slice(0, 20)) {
    const mode = m.mode ? `[${m.mode}] ` : '';
    console.log(`  • ${m.path} ${mode}`);
    console.log(`      source:    ${JSON.stringify(m.source)}`);
    console.log(`      extracted: ${JSON.stringify(m.extracted)}`);
  }
  if (mismatches.length > 20) console.log(`  … and ${mismatches.length - 20} more`);
}

if (typeMismatches.length) {
  console.log('\n─── TYPE MISMATCHES (' + typeMismatches.length + ') ────────────────────────────────────');
  for (const m of typeMismatches) {
    console.log(`  • ${m.path}  source: ${m.source}, extracted: ${m.extracted}`);
  }
}

if (extras.length) {
  console.log('\n─── EXTRA IN EXTRACTED (' + extras.length + ') ─────────────────────────────────');
  for (const e of extras.slice(0, 10)) console.log(`  • ${e}`);
  if (extras.length > 10) console.log(`  … and ${extras.length - 10} more`);
}

console.log('\n' + '═'.repeat(70));
console.log(`  Roundtrip score: ${matches.length}/${total} (${pct}%)`);
console.log('═'.repeat(70) + '\n');

process.exit(matches.length === total && extras.length === 0 ? 0 : 1);

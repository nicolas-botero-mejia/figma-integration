#!/usr/bin/env node
/**
 * parity-check.mjs
 * 
 * Compares source DTCG token files (tokens/) against the Figma Variables export
 * (tmp/figma-export/master-vars.json).
 * 
 * Rules:
 *   - Skip any source token where $figmaExclude: true
 *   - Skip $description / $modes metadata keys
 *   - COLOR: normalize hex to lowercase
 *   - FLOAT: floating-point tolerance 1e-4
 *   - Alias references: {path.to.token} format in both
 *   - Multi-mode tokens ($modes): compare per mode
 *   - Flag as EXPECTED GAP (not defect): lineHeight in text styles
 *
 * Usage: node scripts/parity-check.mjs
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, relative } from 'path';
import { loadConfig } from './lib/load-config.mjs';
import { ROOT } from './lib/root.mjs';

loadConfig();
const TOKENS_DIR = join(ROOT, 'tokens');
const FIGMA_EXPORT = process.env.FIGMA_EXPORT
  ? (process.env.FIGMA_EXPORT.startsWith('/')
      ? process.env.FIGMA_EXPORT
      : join(ROOT, process.env.FIGMA_EXPORT))
  : join(ROOT, 'tmp/figma-export/master-vars.json');

// ─── Load Figma export ────────────────────────────────────────────────────────

if (!existsSync(FIGMA_EXPORT)) {
  console.error('❌  Missing', FIGMA_EXPORT);
  console.error('    Run scripts/assemble-figma-export.mjs first.');
  process.exit(1);
}

const figmaData = JSON.parse(readFileSync(FIGMA_EXPORT, 'utf8'));

// Build flat map: varName → { type, valuesByMode }
const figmaMap = new Map();
for (const [colName, col] of Object.entries(figmaData)) {
  for (const v of col.vars) {
    figmaMap.set(v.n, { type: v.t, vm: v.vm, collection: colName });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normHex(h) {
  if (typeof h !== 'string') return h;
  return h.toLowerCase();
}

function valuesMatch(srcVal, figVal, type) {
  // Both are aliases
  if (typeof srcVal === 'string' && srcVal.startsWith('{') &&
      typeof figVal === 'string' && figVal.startsWith('{')) {
    return srcVal === figVal;
  }
  if (type === 'COLOR') return normHex(srcVal) === normHex(figVal);
  if (type === 'FLOAT') {
    const a = parseFloat(srcVal), b = parseFloat(figVal);
    return !isNaN(a) && !isNaN(b) && Math.abs(a - b) < 1e-4;
  }
  return srcVal === figVal;
}

function dtcgTypeToFigma(dtcgType) {
  switch (dtcgType) {
    case 'color': return 'COLOR';
    case 'number': return 'FLOAT';
    case 'duration': return 'FLOAT'; // motion.duration.* stored as FLOAT in Figma
    case 'fontFamily': return 'STRING';
    case 'string': return 'STRING';
    case 'boolean': return 'BOOLEAN';
    default: return null; // unsupported type in Figma
  }
}

// ─── Walk source tokens ───────────────────────────────────────────────────────

const SKIP_KEYS = new Set(['$description', '$extensions', '$figmaExclude']);

// CSS-only types that can't be Figma variables
// Note: 'duration' is intentionally excluded — duration tokens ($type: "duration") map to FLOAT
// in Figma and are valid variables. motion-easing.json (cubicBezier/transition) is excluded at
// file level via CSS_ONLY_FILES instead.
const CSS_ONLY_TYPES = new Set(['cubicBezier', 'transition', 'shadow']);

// Source tokens expected to be absent from Figma (CSS-only files)
const CSS_ONLY_FILES = new Set([
  'primitives/motion-easing.json',
  'primitives/shadow.json',
  'semantic/typography.json',   // these are Text Styles, not Variables
]);

function isExcluded(node) {
  return node['$figmaExclude'] === true;
}

function collectTokens(obj, pathParts, tokens) {
  if (isExcluded(obj)) return;

  // Leaf node with $value
  if ('$value' in obj) {
    const type = obj['$type'];
    if (!type || CSS_ONLY_TYPES.has(type)) return;
    const figType = dtcgTypeToFigma(type);
    if (!figType) return;
    tokens.push({
      path: pathParts.join('/'),
      dtcgType: type,
      figmaType: figType,
      value: obj['$value'],
      modes: null,
    });
    return;
  }

  // Leaf node with $modes (multi-mode)
  if ('$modes' in obj) {
    const type = obj['$type'];
    if (!type || CSS_ONLY_TYPES.has(type)) return;
    const figType = dtcgTypeToFigma(type);
    if (!figType) return;
    tokens.push({
      path: pathParts.join('/'),
      dtcgType: type,
      figmaType: figType,
      value: null,
      modes: obj['$modes'],
    });
    return;
  }

  // Branch: recurse
  for (const [key, child] of Object.entries(obj)) {
    if (SKIP_KEYS.has(key) || key.startsWith('$')) continue;
    if (child && typeof child === 'object') {
      collectTokens(child, [...pathParts, key], tokens);
    }
  }
}

function findJsonFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) findJsonFiles(full, files);
    else if (entry.endsWith('.json')) files.push(full);
  }
  return files;
}

const sourceTokens = [];
const jsonFiles = findJsonFiles(TOKENS_DIR);

for (const file of jsonFiles) {
  const relPath = relative(TOKENS_DIR, file);
  if (CSS_ONLY_FILES.has(relPath)) continue; // whole file is CSS-only

  const raw = JSON.parse(readFileSync(file, 'utf8'));
  if (isExcluded(raw)) continue;
  collectTokens(raw, [], sourceTokens);
}

// ─── Compare ──────────────────────────────────────────────────────────────────

const MISSING_IN_FIGMA = [];    // in source, not in Figma
const EXTRA_IN_FIGMA   = [];    // in Figma, not in source (or excluded source)
const TYPE_MISMATCH    = [];    // type differs
const VALUE_MISMATCH   = [];    // value differs
const NULL_IN_FIGMA    = [];    // Figma has null value (broken alias)
const MATCHES          = [];    // everything matches

const figmaSeen = new Set();

for (const tok of sourceTokens) {
  const figVar = figmaMap.get(tok.path);

  if (!figVar) {
    MISSING_IN_FIGMA.push({ path: tok.path, srcType: tok.dtcgType });
    continue;
  }

  figmaSeen.add(tok.path);

  // Type check
  if (tok.figmaType !== figVar.type) {
    TYPE_MISMATCH.push({
      path: tok.path,
      expected: tok.figmaType,
      actual: figVar.type,
    });
    continue;
  }

  // Value check
  if (tok.modes) {
    // Multi-mode token
    let ok = true;
    for (const [mode, srcVal] of Object.entries(tok.modes)) {
      const figVal = figVar.vm[mode];
      if (figVal === null || figVal === undefined) {
        NULL_IN_FIGMA.push({ path: tok.path, mode, srcVal });
        ok = false;
      } else if (!valuesMatch(srcVal, figVal, tok.figmaType)) {
        VALUE_MISMATCH.push({ path: tok.path, mode, srcVal, figVal });
        ok = false;
      }
    }
    if (ok) MATCHES.push(tok.path);
  } else {
    // Single-mode: use defaultMode value
    const colEntry = figVar;
    // Get default mode value (first mode value)
    const firstModeName = Object.keys(figVar.vm)[0];
    const figVal = figVar.vm[firstModeName];

    if (figVal === null || figVal === undefined) {
      NULL_IN_FIGMA.push({ path: tok.path, mode: firstModeName, srcVal: tok.value });
    } else if (!valuesMatch(tok.value, figVal, tok.figmaType)) {
      VALUE_MISMATCH.push({ path: tok.path, srcVal: tok.value, figVal });
    } else {
      MATCHES.push(tok.path);
    }
  }
}

// Check for extras in Figma (not in any source token after exclusions)
const sourcePathSet = new Set(sourceTokens.map(t => t.path));
for (const [name, v] of figmaMap) {
  if (!sourcePathSet.has(name)) {
    EXTRA_IN_FIGMA.push({ path: name, type: v.type, collection: v.collection });
  }
}

// ─── Report ───────────────────────────────────────────────────────────────────

const total = sourceTokens.length;
const figmaTotal = figmaMap.size;

console.log('\n' + '═'.repeat(70));
console.log('  PARITY CHECK REPORT — Source DTCG ↔ Figma Variables Export');
console.log('═'.repeat(70));
console.log(`\n  Source tokens (Figma-eligible):  ${total}`);
console.log(`  Figma variables (total):          ${figmaTotal}`);
console.log(`\n  ✅  Matches:                      ${MATCHES.length}`);
console.log(`  ❌  Missing in Figma:              ${MISSING_IN_FIGMA.length}`);
console.log(`  🟡  Null values in Figma:          ${NULL_IN_FIGMA.length}`);
console.log(`  🔴  Value mismatches:              ${VALUE_MISMATCH.length}`);
console.log(`  ⚠️   Type mismatches:               ${TYPE_MISMATCH.length}`);
console.log(`  ➕  Extra in Figma (not in source): ${EXTRA_IN_FIGMA.length}`);

if (MISSING_IN_FIGMA.length) {
  console.log('\n─── MISSING IN FIGMA (' + MISSING_IN_FIGMA.length + ') ─────────────────────────────');
  for (const m of MISSING_IN_FIGMA) {
    console.log(`  • ${m.path}  [${m.srcType}]`);
  }
}

if (NULL_IN_FIGMA.length) {
  console.log('\n─── NULL VALUES IN FIGMA (' + NULL_IN_FIGMA.length + ') ──────────────────────────────');
  console.log('  (These are broken alias references — the alias target is CSS-only/excluded)');
  for (const n of NULL_IN_FIGMA) {
    const mode = n.mode ? `[${n.mode}]` : '';
    console.log(`  • ${n.path} ${mode}  src: ${JSON.stringify(n.srcVal)}`);
  }
}

if (VALUE_MISMATCH.length) {
  console.log('\n─── VALUE MISMATCHES (' + VALUE_MISMATCH.length + ') ──────────────────────────────────');
  for (const m of VALUE_MISMATCH) {
    const mode = m.mode ? `[${m.mode}]` : '';
    console.log(`  • ${m.path} ${mode}`);
    console.log(`      src: ${JSON.stringify(m.srcVal)}`);
    console.log(`      fig: ${JSON.stringify(m.figVal)}`);
  }
}

if (TYPE_MISMATCH.length) {
  console.log('\n─── TYPE MISMATCHES (' + TYPE_MISMATCH.length + ') ────────────────────────────────────');
  for (const m of TYPE_MISMATCH) {
    console.log(`  • ${m.path}  expected ${m.expected}, got ${m.actual}`);
  }
}

if (EXTRA_IN_FIGMA.length) {
  console.log('\n─── EXTRA IN FIGMA (' + EXTRA_IN_FIGMA.length + ') ─────────────────────────────────');
  console.log('  (Variables in Figma with no matching source token — may be intentional)');
  for (const e of EXTRA_IN_FIGMA) {
    console.log(`  • [${e.collection}] ${e.path}  [${e.type}]`);
  }
}

console.log('\n' + '═'.repeat(70));
const pct = Math.round(MATCHES.length / total * 100);
console.log(`  Parity score: ${MATCHES.length}/${total} (${pct}%)`);
console.log('═'.repeat(70) + '\n');

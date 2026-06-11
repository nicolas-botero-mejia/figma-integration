/**
 * dtcg-to-figma-tokens.mjs
 * Converts DTCG JSON files → figma-import-tokens TOKENS array format.
 * Usage: node scripts/dtcg-to-figma-tokens.mjs --mode "Value" file1.json file2.json ...
 * Output: JSON { collection, mode, tokens }
 */
import { readFileSync } from 'fs';
import { loadConfig } from './lib/load-config.mjs';

loadConfig();

// ── CLI args ──────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const modeIdx = argv.indexOf('--mode');
const mode = modeIdx !== -1 ? argv[modeIdx + 1] : 'Value';
const files = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--mode');

// ── type mapping ──────────────────────────────────────────────────────────────
function dtcgTypeToFigma(type) {
  const map = {
    color: 'COLOR',
    number: 'FLOAT',
    fontFamily: 'STRING',
    fontWeight: 'FLOAT',
    string: 'STRING',
    boolean: 'BOOLEAN',
    duration: 'FLOAT',
    dimension: 'FLOAT',
  };
  return map[type] || 'STRING';
}

function isAlias(val) {
  return typeof val === 'string' && val.startsWith('{') && val.endsWith('}');
}

// ── DTCG walker ───────────────────────────────────────────────────────────────
function coerceValue(val, figmaType) {
  // Keep rgba() / 'transparent' / 'none' as STRING even if $type says color
  if (
    figmaType === 'COLOR' &&
    typeof val === 'string' &&
    (val.startsWith('rgba') || val === 'transparent' || val === 'none')
  ) {
    return { type: 'STRING', value: val };
  }
  const value = isAlias(val) ? { reference: val } : val;
  return { type: figmaType, value };
}

function walk(node, pathParts, modeName, tokens, inheritedType) {
  if (typeof node !== 'object' || node === null) return;

  // Multi-mode token: has $modes instead of $value
  if ('$modes' in node) {
    if (node['$figmaExclude']) return;
    const type = node['$type'] || inheritedType || 'string';
    if (type === 'cubicBezier' || type === 'transition') return;
    const figmaType = dtcgTypeToFigma(type);

    const existing = tokens.find(t => t.name === pathParts.join('/'));
    const modeValues = {};
    for (const [mKey, mVal] of Object.entries(node['$modes'])) {
      const { type: actualType, value } = coerceValue(mVal, figmaType);
      modeValues[mKey] = value;
      // Use the first mode's type if there's a coercion (rare for modes)
      if (!existing) {
        tokens._pendingType = actualType;
      }
    }

    if (existing) {
      Object.assign(existing.values, modeValues);
    } else {
      tokens.push({
        name: pathParts.join('/'),
        type: tokens._pendingType || figmaType,
        values: modeValues,
      });
      delete tokens._pendingType;
    }
    return;
  }

  if ('$value' in node) {
    if (node['$figmaExclude']) return;
    const type = node['$type'] || inheritedType || 'string';
    if (type === 'cubicBezier' || type === 'transition') return;

    const figmaType = dtcgTypeToFigma(type);
    const { type: actualType, value } = coerceValue(node['$value'], figmaType);

    tokens.push({
      name: pathParts.join('/'),
      type: actualType,
      values: { [modeName]: value },
    });
    return;
  }

  const childType = node['$type'] || inheritedType;
  for (const [key, child] of Object.entries(node)) {
    if (key.startsWith('$')) continue;
    walk(child, [...pathParts, key], modeName, tokens, childType);
  }
}

// ── merge files ───────────────────────────────────────────────────────────────
const merged = {};
for (const f of files) {
  let data;
  try {
    data = JSON.parse(readFileSync(f, 'utf8'));
  } catch (e) {
    process.stderr.write(`[WARN] Could not read ${f}: ${e.message}\n`);
    continue;
  }
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('$')) continue;
    merged[k] = v;
  }
}

// ── convert ───────────────────────────────────────────────────────────────────
const tokens = [];
walk(merged, [], mode, tokens, null);

process.stdout.write(JSON.stringify(tokens, null, 0));

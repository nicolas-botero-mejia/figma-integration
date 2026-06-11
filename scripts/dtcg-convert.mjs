#!/usr/bin/env node
// dtcg-convert.mjs — DTCG JSON → CSS / Tailwind v4 converter for code-authored tokens.
//
// PURPOSE
//   Handles DTCG-native token types that have no Figma Variable equivalent:
//   cubicBezier, transition (composite), shadow, typography.
//   For Figma Variable-extracted tokens, use the figma-export-tokens skill's
//   convert-tokens.mjs instead.
//
// USAGE
//   node scripts/dtcg-convert.mjs <tokens.json> --format <fmt> [--resolve-from <file>...] [--out <dir>]
//
//   --format         dtcg (default) | css-vars | tailwind-v4
//                    aliases: css → css-vars, tailwind → tailwind-v4
//   --resolve-from   one or more additional DTCG files to load into the alias lookup table.
//                    Tokens from these files are NOT emitted — they exist only so that alias
//                    references in the primary file can be resolved across file boundaries.
//                    Repeat the flag for multiple files:
//                      --resolve-from motion.json --resolve-from color.json
//   --out            directory to write file(s) into; else prints to stdout
//
// EXAMPLES
//   node scripts/dtcg-convert.mjs tokens/primitives/motion-easing.json --format tailwind-v4 \
//     --resolve-from tokens/primitives/motion.json
//   node scripts/dtcg-convert.mjs tokens/primitives/motion.json --format css-vars
//   node scripts/dtcg-convert.mjs tokens/primitives/motion.json --format dtcg
//
// SUPPORTED DTCG TYPES
//   color, dimension, number, duration, cubicBezier, transition (composite),
//   string, boolean, fontFamily, fontWeight
//   (shadow and typography composites: emitted as JSON string, CSS skipped with warning)
//
// ALIAS RESOLUTION
//   {dot.path.references} are resolved up to 8 hops deep.
//   Transition composite fields (duration, timingFunction, delay) are resolved before
//   CSS formatting — so aliases to cubicBezier tokens work correctly.

import fs from 'node:fs';
import path from 'node:path';

// ── args ───────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flags = {};
const resolveFromFiles = [];
const positionals = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--resolve-from') {
    const n = argv[i + 1];
    if (n && !n.startsWith('--')) { resolveFromFiles.push(argv[++i]); }
  } else if (a.startsWith('--')) {
    const n = argv[i + 1];
    flags[a.slice(2)] = n && !n.startsWith('--') ? argv[++i] : true;
  } else {
    positionals.push(a);
  }
}
const FORMAT_ALIASES = { css: 'css-vars', tailwind: 'tailwind-v4' };
let FORMAT = String(flags.format || 'dtcg').toLowerCase();
FORMAT = FORMAT_ALIASES[FORMAT] || FORMAT;
const OUT_DIR = typeof flags.out === 'string' ? flags.out : null;

// ── input ──────────────────────────────────────────────────────────────────────
let raw;
try {
  raw = positionals[0] ? fs.readFileSync(positionals[0], 'utf8') : fs.readFileSync(0, 'utf8');
} catch (e) {
  console.error('Could not read input. Pass a file path or pipe JSON on stdin.\n' + e.message);
  process.exit(1);
}
let data;
try { data = JSON.parse(raw); } catch (e) {
  console.error('Input is not valid JSON: ' + e.message);
  process.exit(1);
}
if (typeof data !== 'object' || data === null || Array.isArray(data)) {
  console.error('Input must be a DTCG JSON object (not an array or primitive).');
  process.exit(1);
}

// ── DTCG walker ────────────────────────────────────────────────────────────────
// Normalizes the DTCG tree into a flat token list.
// Respects group-level $type inheritance (DTCG spec §5.2).

const tokens = []; // { path: string[], name: string, type: string, value: any, description: string }
const warnings = [];

// Load --resolve-from files into a separate list (alias targets only, not emitted).
const resolveOnlyTokens = [];
for (const rf of resolveFromFiles) {
  let rfData;
  try {
    rfData = JSON.parse(fs.readFileSync(rf, 'utf8'));
  } catch (e) {
    warnings.push(`--resolve-from: could not read "${rf}": ${e.message}`);
    continue;
  }
  walkDtcg(rfData, [], null, resolveOnlyTokens);
}

function walkDtcg(node, pathSegs, inheritedType, targetList = tokens) {
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return;

  // Group-level $type propagates to all children unless a child overrides it
  const groupType = node.$type || inheritedType;

  if ('$value' in node) {
    targetList.push({
      path: pathSegs,
      name: pathSegs.join('/'),
      type: groupType || 'string',
      value: node.$value,
      description: node.$description || '',
    });
    return;
  }

  for (const [key, val] of Object.entries(node)) {
    if (key.startsWith('$')) continue; // skip DTCG metadata ($type, $description, $extensions)
    if (typeof val === 'object' && val !== null) {
      walkDtcg(val, [...pathSegs, key], groupType, targetList);
    }
  }
}

walkDtcg(data, [], null);

if (tokens.length === 0) {
  console.error('No tokens found. Ensure the input is a valid DTCG file with $value leaves.');
  process.exit(1);
}

// ── token lookup map ───────────────────────────────────────────────────────────
// Keyed by dot-path (e.g. "motion.duration.base") to match DTCG alias syntax.
// Includes resolve-only tokens so cross-file aliases resolve correctly.
const tokenMap = {};
for (const t of [...resolveOnlyTokens, ...tokens]) tokenMap[t.path.join('.')] = t;

// ── alias helpers ──────────────────────────────────────────────────────────────
function isDtcgAlias(v) { return typeof v === 'string' && /^\{[^}]+\}$/.test(v); }
function aliasKey(v) { return v.replace(/^\{|\}$/g, ''); }

function resolveValue(value, depth = 0) {
  if (depth > 8) { warnings.push('Alias chain exceeded 8 hops — possible cycle.'); return null; }
  if (!isDtcgAlias(value)) return value;
  const target = tokenMap[aliasKey(value)];
  if (!target) { warnings.push(`Unresolved alias: ${value}`); return null; }
  return resolveValue(target.value, depth + 1);
}

// ── CSS value formatters ───────────────────────────────────────────────────────
function cssLiteral(value, type) {
  if (typeof value === 'number') {
    if (type === 'dimension') return `${value}px`;
    if (type === 'duration') return `${value}ms`;
    return String(value);
  }

  if (Array.isArray(value) && type === 'cubicBezier') {
    if (value.length !== 4) warnings.push(`cubicBezier value must have 4 components: ${JSON.stringify(value)}`);
    return `cubic-bezier(${value.join(', ')})`;
  }

  if (typeof value === 'object' && value !== null && type === 'transition') {
    // Resolve each composite field before formatting.
    // duration / timingFunction are usually aliases; delay may be an inline {value, unit} object.
    const rawDur = isDtcgAlias(value.duration) ? resolveValue(value.duration) : value.duration;
    const rawTf  = isDtcgAlias(value.timingFunction) ? resolveValue(value.timingFunction) : value.timingFunction;
    const rawDel = value.delay;

    const durStr = typeof rawDur === 'number' ? `${rawDur}ms` : String(rawDur ?? '0ms');
    const tfStr  = Array.isArray(rawTf) ? `cubic-bezier(${rawTf.join(', ')})` : String(rawTf ?? 'ease');

    let delStr = '0ms';
    if (typeof rawDel === 'object' && rawDel !== null && 'value' in rawDel) {
      delStr = `${rawDel.value}${rawDel.unit ?? 'ms'}`;
    } else if (isDtcgAlias(rawDel)) {
      const resolved = resolveValue(rawDel);
      delStr = typeof resolved === 'number' ? `${resolved}ms` : String(resolved ?? '0ms');
    } else if (typeof rawDel === 'number') {
      delStr = `${rawDel}ms`;
    }

    return `${durStr} ${delStr} ${tfStr}`;
  }

  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return String(value);

  // Composite types not yet handled (shadow, typography) — emit as comment warning
  if (typeof value === 'object') {
    warnings.push(`Composite value for type "${type}" cannot be converted to a CSS literal. Emitting raw JSON.`);
    return JSON.stringify(value);
  }

  return String(value);
}

// ── name helpers ───────────────────────────────────────────────────────────────
function slugify(s) {
  return String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
function toCssVarName(pathSegs) {
  return '--' + pathSegs.map(slugify).join('-');
}

// ── Tailwind v4 namespace + prefix stripping ───────────────────────────────────
// Maps DTCG type → @theme namespace, and lists path segment prefixes to strip
// so the variable name isn't redundant (e.g. motion/easing/standard → --motion-easing-standard,
// not --motion-easing-motion-easing-standard).

const TW_NS = {
  color:               { ns: 'color',               strip: ['color', 'colors'] },
  dimension:           { ns: 'spacing',              strip: ['spacing', 'space'] },
  duration:            { ns: 'transition-duration',  strip: ['motion', 'duration', 'delay', 'transition-duration', 'transition'] },
  cubicBezier:         { ns: 'motion-easing',        strip: ['motion', 'easing'] },
  transition:          { ns: 'motion-transition',    strip: ['motion', 'transition'] },
  fontFamily:          { ns: 'font',                 strip: ['font', 'font-family'] },
  fontWeight:          { ns: 'font-weight',          strip: ['font-weight', 'weight'] },
};

function twV4Name(t) {
  const entry = TW_NS[t.type];
  if (!entry) return null;
  let segs = t.path.map(slugify);
  while (segs.length > 1 && entry.strip.includes(segs[0])) segs = segs.slice(1);
  return `--${entry.ns}-${segs.join('-')}`;
}

// ── emitters ───────────────────────────────────────────────────────────────────
function emitDtcg() {
  // Passthrough — re-emit the input as-is (validated and parsed successfully).
  return [{ path: 'tokens.tokens.json', content: JSON.stringify(data, null, 2) + '\n' }];
}

function emitCss() {
  const lines = ['/* Generated by dtcg-convert.mjs */', '', ':root {'];
  for (const t of tokens) {
    const varName = toCssVarName(t.path);
    if (isDtcgAlias(t.value)) {
      const resolved = resolveValue(t.value);
      if (resolved === null) { warnings.push(`${t.name}: unresolved alias — skipped.`); continue; }
      const target = tokenMap[aliasKey(t.value)];
      lines.push(`  ${varName}: var(${toCssVarName(target.path)});`);
    } else {
      lines.push(`  ${varName}: ${cssLiteral(t.value, t.type)};`);
    }
  }
  lines.push('}', '');
  return [{ path: 'tokens.css', content: lines.join('\n') }];
}

function emitTailwindV4() {
  const skipped = [];
  const baseLines = [];
  for (const t of tokens) {
    const varName = twV4Name(t);
    if (!varName) { skipped.push(t.name); continue; }

    if (isDtcgAlias(t.value)) {
      const resolved = resolveValue(t.value);
      if (resolved === null) { warnings.push(`${t.name}: unresolved alias — skipped.`); continue; }
      const target = tokenMap[aliasKey(t.value)];
      const targetVarName = twV4Name(target) ?? toCssVarName(target.path);
      baseLines.push(`  ${varName}: var(${targetVarName});`);
    } else {
      baseLines.push(`  ${varName}: ${cssLiteral(t.value, t.type)};`);
    }
  }

  if (skipped.length) {
    warnings.push(`Tailwind: ${skipped.length} token(s) skipped (no @theme namespace): ${skipped.join(', ')}`);
  }

  const lines = ['/* Generated by dtcg-convert.mjs (Tailwind v4) */', '@theme {', ...baseLines, '}', ''];
  return [{ path: 'theme.css', content: lines.join('\n') }];
}

// ── dispatch ───────────────────────────────────────────────────────────────────
const EMITTERS = { dtcg: emitDtcg, 'css-vars': emitCss, 'tailwind-v4': emitTailwindV4 };
const emit = EMITTERS[FORMAT];
if (!emit) {
  console.error(`Unknown --format "${FORMAT}". Supported: dtcg, css-vars, tailwind-v4 (aliases: css, tailwind).`);
  process.exit(1);
}

const outFiles = emit();
if (OUT_DIR) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of outFiles) {
    const p = path.join(OUT_DIR, f.path);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, f.content);
    console.error(`Wrote ${p}`);
  }
  console.error(`(${tokens.length} tokens, format=${FORMAT})`);
} else {
  for (const f of outFiles) process.stdout.write(f.content);
}

if (warnings.length) {
  console.error(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.error('  ⚠ ' + w);
}

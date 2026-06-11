#!/usr/bin/env node
/**
 * figma-export-to-dtcg.mjs
 *
 * Converts a Figma Variables export (master-vars.json format) into DTCG JSON
 * files under tmp/tokens/, mirroring the tokens/ source tree.
 *
 * Input:  tmp/figma-export/master-vars.json  (or --input path)
 * Output: tmp/tokens/                       (or --output path)
 *
 * Usage:
 *   node scripts/figma-export-to-dtcg.mjs
 *   node scripts/figma-export-to-dtcg.mjs --input tmp/figma-export/copy-vars.json --output tmp/tokens-copy
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

function parseArgs(argv) {
  const opts = {
    input: join(ROOT, 'tmp/figma-export/master-vars.json'),
    output: join(ROOT, 'tmp/tokens'),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input') opts.input = argv[++i].startsWith('/') ? argv[i] : join(ROOT, argv[i]);
    if (argv[i] === '--output') opts.output = argv[++i].startsWith('/') ? argv[i] : join(ROOT, argv[i]);
  }
  return opts;
}

// Collection → first path segment → source file
const ROUTES = {
  Primitives: {
    color: 'primitives/color.json',
    space: 'primitives/spacing.json',
    font: 'primitives/typography.json',
    radius: 'primitives/radius.json',
    border: 'primitives/border.json',
    opacity: 'primitives/opacity.json',
    size: 'primitives/sizing.json',
    z: 'primitives/sizing.json',
    motion: 'primitives/motion.json',
  },
  Semantic: {
    color: 'semantic/color.json',
    space: 'semantic/spacing.json',
    focus: 'semantic/focus.json',
    disabled: 'semantic/focus.json',
    border: 'semantic/border.json',
    transition: 'semantic/motion.json',
    animation: 'semantic/motion.json',
  },
  Components: {
    button: 'components/button.json',
    input: 'components/input.json',
    table: 'components/data.json',
    chart: 'components/data.json',
    badge: 'components/feedback.json',
    tag: 'components/feedback.json',
    alert: 'components/feedback.json',
    notification: 'components/feedback.json',
    progress: 'components/feedback.json',
    spinner: 'components/feedback.json',
    label: 'components/forms.json',
    helptext: 'components/forms.json',
    checkbox: 'components/forms.json',
    radio: 'components/forms.json',
    toggle: 'components/forms.json',
    select: 'components/forms.json',
    form: 'components/forms.json',
    card: 'components/layout.json',
    modal: 'components/layout.json',
    divider: 'components/layout.json',
    accordion: 'components/layout.json',
    tabs: 'components/navigation.json',
    breadcrumb: 'components/navigation.json',
    pagination: 'components/navigation.json',
    link: 'components/navigation.json',
    tooltip: 'components/overlays.json',
    popover: 'components/overlays.json',
    avatar: 'components/overlays.json',
  },
  Density: {
    density: 'density/spacing.json',
  },
  Layout: {
    breakpoint: 'layout/breakpoints.json',
    grid: 'layout/breakpoints.json',
  },
};

function figmaTypeToDtcg(figmaType, name) {
  if (figmaType === 'COLOR') return 'color';
  if (figmaType === 'BOOLEAN') return 'boolean';
  if (figmaType === 'STRING') {
    if (name.startsWith('font/family/') || name.endsWith('/font/family')) return 'fontFamily';
    return 'string';
  }
  if (figmaType === 'FLOAT') {
    if (name.startsWith('motion/duration/')) return 'duration';
    return 'number';
  }
  return figmaType.toLowerCase();
}

function setNested(obj, pathParts, value) {
  let cursor = obj;
  for (let i = 0; i < pathParts.length - 1; i++) {
    const key = pathParts[i];
    if (!cursor[key] || typeof cursor[key] !== 'object' || '$value' in cursor[key] || '$modes' in cursor[key]) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  cursor[pathParts[pathParts.length - 1]] = value;
}

function coerceValue(raw) {
  if (typeof raw === 'string' && raw.startsWith('{') && raw.endsWith('}')) return raw;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'boolean') return raw;
  if (typeof raw === 'string' && /^#[0-9a-fA-F]+$/.test(raw)) return raw.toUpperCase();
  return raw;
}

function varToDtcgToken(v) {
  const modes = Object.keys(v.vm);
  const type = figmaTypeToDtcg(v.t, v.n);

  if (modes.length > 1) {
    const $modes = {};
    for (const mode of modes) {
      $modes[mode] = coerceValue(v.vm[mode]);
    }
    return { $type: type, $modes };
  }

  const value = coerceValue(v.vm[modes[0]]);
  return { $type: type, $value: value };
}

function routeVariable(collection, name) {
  const prefix = name.split('/')[0];
  const routes = ROUTES[collection];
  if (!routes) return null;
  return routes[prefix] || null;
}

const { input, output } = parseArgs(process.argv.slice(2));
const figmaData = JSON.parse(readFileSync(input, 'utf8'));

const fileTrees = new Map();
const unmapped = [];

for (const [collection, colData] of Object.entries(figmaData)) {
  for (const v of colData.vars) {
    const relFile = routeVariable(collection, v.n);
    if (!relFile) {
      unmapped.push({ collection, name: v.n });
      continue;
    }

    if (!fileTrees.has(relFile)) fileTrees.set(relFile, {});
    const tree = fileTrees.get(relFile);
    const pathParts = v.n.split('/');
    setNested(tree, pathParts, varToDtcgToken(v));
  }
}

mkdirSync(output, { recursive: true });

let totalTokens = 0;
for (const [relFile, tree] of [...fileTrees.entries()].sort()) {
  const outPath = join(output, relFile);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(tree, null, 2) + '\n');
  const count = JSON.stringify(tree).match(/"\$value"|"\$modes"/g)?.length || 0;
  totalTokens += count;
  console.log(`  ${relFile.padEnd(35)} ${count} tokens`);
}

console.log(`\n✅ Wrote ${fileTrees.size} files (${totalTokens} tokens) → ${output}`);

if (unmapped.length) {
  console.warn(`\n⚠️  ${unmapped.length} unmapped variables:`);
  for (const u of unmapped) {
    console.warn(`  • [${u.collection}] ${u.name}`);
  }
}

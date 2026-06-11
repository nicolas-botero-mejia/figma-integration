#!/usr/bin/env node
/** Usage: cat raw.json | node scripts/save-chunk-stdin.mjs outfile.json */
import { readFileSync, writeFileSync } from 'fs';
const data = JSON.parse(readFileSync(0, 'utf8'));
const out = { modes: data.modes, defaultMode: data.defaultMode, vars: data.vars };
writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
console.log(`${process.argv[2]} — ${out.vars.length} vars`);

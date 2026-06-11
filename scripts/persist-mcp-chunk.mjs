#!/usr/bin/env node
/** Usage: node scripts/persist-mcp-chunk.mjs <raw-mcp.json> <out-chunk.json> */
import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const out = { modes: data.modes, defaultMode: data.defaultMode, vars: data.vars };
writeFileSync(process.argv[3], JSON.stringify(out, null, 2));
console.log(`${process.argv[3]} — ${out.vars.length} vars`);

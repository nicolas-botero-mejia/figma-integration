#!/usr/bin/env node
// Post-process: expand single font-family Variable values into CSS fallback stacks.
// Usage: node expand-font-stacks.mjs <input.css> [output.css]
// Reads from stdin if no input file. Prints to stdout if no output file.

import fs from 'node:fs';

const FONT_STACKS = {
  'Outfit': 'Outfit, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'Inter': 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  'Courier': '"Courier New", Courier, monospace',
};

const [,, inFile, outFile] = process.argv;
const css = inFile ? fs.readFileSync(inFile, 'utf8') : fs.readFileSync(0, 'utf8');

const result = css.replace(
  /(--font-family-[^:]+:\s*)([A-Za-z][A-Za-z0-9 -]*)(;)/g,
  (_, prop, name, semi) => `${prop}${FONT_STACKS[name.trim()] ?? name.trim()}${semi}`
);

if (outFile) fs.writeFileSync(outFile, result);
else process.stdout.write(result);

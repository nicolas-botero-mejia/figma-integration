# Scripts

| Script | Purpose |
|---|---|
| `check-config.mjs` | Report config status (`npm run config`) |
| `init-config.mjs` | Write `config/figma.json` from URL + collections (`npm run init`) |
| `parse-figma-url.mjs` | Parse Figma URL → fileKey, fileName (`npm run parse-url`) |
| `lib/load-config.mjs` | Merge defaults + local config; guard pipeline scripts |
| `lib/parse-figma-url.mjs` | URL parser (shared) |
| `dtcg-to-figma-tokens.mjs` | DTCG JSON → TOKENS array for `use_figma` push |
| `figma-export-to-dtcg.mjs` | `master-vars.json` → `tmp/tokens/` |
| `assemble-figma-export.mjs` | Per-collection chunks → single export JSON |
| `parity-check.mjs` | Flat compare `tokens/` ↔ Figma export |
| `compare-token-trees.mjs` | Structural compare `tokens/` ↔ `tmp/tokens/` |
| `dtcg-convert.mjs` | DTCG → CSS vars / Tailwind v4 |

**Init flow:** URL in chat → agent discovers collections via MCP → `npm run init`.

Skills: copy from https://github.com/southleft/figma-console-mcp-skills → `.cursor/skills/`

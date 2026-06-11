# Scripts

| Script | Purpose |
|---|---|
| `dtcg-to-figma-tokens.mjs` | DTCG JSON → TOKENS array for `use_figma` push |
| `figma-export-to-dtcg.mjs` | `master-vars.json` → `tmp/tokens/` |
| `assemble-figma-export.mjs` | Per-collection chunks → single export JSON |
| `parity-check.mjs` | Flat compare `tokens/` ↔ Figma export |
| `compare-token-trees.mjs` | Structural compare `tokens/` ↔ `tmp/tokens/` |
| `dtcg-convert.mjs` | DTCG → CSS vars / Tailwind v4 |
| `expand-font-stacks.mjs` | Bare font names → full CSS stacks |
| `get-styles.js` | `use_figma` snippet — Text/Effect Styles read |
| `persist-mcp-chunk.mjs` | Save MCP extraction chunk to disk |
| `save-chunk-stdin.mjs` | Pipe stdin → chunk JSON |

Skills: copy from https://github.com/southleft/figma-console-mcp-skills → `.cursor/skills/`

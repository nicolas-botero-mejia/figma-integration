# tmp/ (local only — gitignored)

| Path | Purpose |
|---|---|
| `figma-export/master-vars.json` | Flat Figma Variables snapshot |
| `figma-export/chunks/` | Per-collection MCP extraction chunks |
| `tokens/` | DTCG reconstructed from Figma (roundtrip validation) |
| `css-only-tokens/` | Shadow, easing, typography — merge into `tokens/` when ready |

```bash
node scripts/assemble-figma-export.mjs
node scripts/figma-export-to-dtcg.mjs
npm test
```

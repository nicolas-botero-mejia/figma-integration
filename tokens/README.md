# tokens/

Empty DTCG JSON scaffolds. **Populate from Figma** — this is not the starting source.

| Folder | Figma collection |
|---|---|
| `primitives/` | Primitives |
| `semantic/` | Semantic |
| `components/` | Components |
| `density/` | Density |
| `layout/` | Layout |

After extraction: `node scripts/figma-export-to-dtcg.mjs` writes to `tmp/tokens/` — merge into here.

**CSS-only** (not Figma Variables): shadow, motion-easing, semantic typography — see `tmp/css-only-tokens/`.

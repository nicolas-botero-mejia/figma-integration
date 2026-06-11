# Figma Integration

## What This Is

Design-token pipeline: DTCG JSON ↔ Figma Variables on the REDY Design System file.

---

## Figma Source

**File:** `https://www.figma.com/design/vuoYR8rDz1O27OsqmQfd84/REDY-Design-System?node-id=73443-2&m=dev`

| Field | Value |
|---|---|
| File key | `vuoYR8rDz1O27OsqmQfd84` |
| Canonical config | `config/figma.json` |

---

## How to Start

**Returning session:** Read `tmp/session-findings.md`, then verify parity:

```bash
npm test
```

**Figma MCP:** Remote OAuth — no Figma Desktop required.

1. MCP config: `.cursor/mcp.json` (committed) or `/add-plugin figma`
2. Server: `figma` at `https://mcp.figma.com/mcp` (plugin tools may show as `plugin-figma-figma`)
3. **Skills:** copy from https://github.com/southleft/figma-console-mcp-skills into `.cursor/skills/` (see README)
4. Load `figma-use` before every `use_figma` call

**Do not use:** `figma-console-mcp`, `figma-mcp-go`, `figma-developer-mcp` — removed from this project.

---

## Pipeline (verified)

| Direction | Tooling | Status |
|---|---|---|
| JSON → Figma | `dtcg-to-figma-tokens.mjs` + `use_figma` apply | ✅ 794/794 |
| Figma → flat export | `use_figma` extract → `assemble-figma-export.mjs` | ✅ |
| Figma → DTCG files | `figma-export-to-dtcg.mjs` → `tmp/tokens/` | ✅ 794/794 |
| DTCG → CSS | `dtcg-convert.mjs` | ✅ |
| Parity | `parity-check.mjs`, `compare-token-trees.mjs` | ✅ 100% |

CSS-only tokens (shadows, easing, semantic typography) stay in `tokens/` only — not in Figma Variables. See `scripts/README.md`.

---

## Repo Structure

```
config/
  figma.json             → file key, URL, collection names
tokens/
  primitives/            → raw values + CSS-only files (shadow, motion-easing)
  semantic/              → theme aliases (+ typography.json for Text Styles)
  components/            → component tokens
  density/               → multi-mode density tokens
  layout/                → breakpoints + grid
tmp/
  figma-export/          → master-vars.json + per-collection chunks
  tokens/                → reconstructed DTCG from Figma (validation)
  session-findings.md    → running log — READ at session start
scripts/                 → see scripts/README.md
```

---

## Where Findings Go

**CRC findings file:**
`/Users/nicolasbotero/Library/CloudStorage/OneDrive-TheKsquareGroup/CRC_DS_Group/findings/phase-01-poc-01-token-pipeline-notes.md`

Write incrementally after each step. Primary reusable outputs preserved in CRC project, not only here.

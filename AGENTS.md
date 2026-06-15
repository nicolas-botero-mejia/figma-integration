# Figma Integration — agent instructions

Tool-agnostic guidance for AI assistants working in this repo.

**Human setup (MCP plugin, OAuth, skills):** see **`README.md`**.

**CLI is the source of truth.** All init and validation steps must be achievable with `npm` scripts and `gh`. Do not require a specific editor.

---

## What this is

Design-token pipeline: DTCG JSON ↔ Figma Variables bidirectional sync.

**Figma is the source of truth.** The `tokens/` tree ships as empty JSON scaffolds — populate by extracting from Figma.

---

## Initialize (CLI-first)

The user provides a **Figma file URL**.

```bash
npm run parse-url -- "https://www.figma.com/design/FILE_KEY/file-name"
npm run init -- --url "https://www.figma.com/design/…"
npm run config    # must exit 0, status ok
```

Collections default from `tokens/` folders (primitives → Primitives, semantic → Semantic, components → Components, density → Density, layout → Layout). Override with `--collections` if Figma names differ.

Partial init:

```bash
npm run init -- --url "https://…"
npm run init -- --merge --collections CollectionA CollectionB
```

---

## Figma MCP (extract/push only)

Required for variable extract/push — not for CLI-only init when collection names are known. Setup order in **`README.md`**:

1. Figma MCP plugin installed
2. OAuth authenticated (Copilot app: **`copilot`** CLI — see README)
3. **`figma-use`** skill installed from [southleft/figma-console-mcp-skills](https://github.com/southleft/figma-console-mcp-skills) — load before every **`use_figma`** call
4. Run **`scripts/mcp-connection-test.js`** via `use_figma` before first extract

Use **Design-mode** URLs only (not `?m=dev`).

---

## Returning session

```bash
npm run config    # must pass before pipeline scripts
npm test          # after Figma export + populated tokens/
```

---

## Pipeline

| Direction | Tooling |
|---|---|
| Figma → flat export | MCP extract → `assemble-figma-export.mjs` |
| Figma → DTCG files | `figma-export-to-dtcg.mjs` → `tmp/tokens/` → merge to `tokens/` |
| JSON → Figma | `dtcg-to-figma-tokens.mjs` + MCP apply |
| DTCG → CSS | `dtcg-convert.mjs` |
| Parity | `parity-check.mjs`, `compare-token-trees.mjs` |

**CSS-only tokens** (shadows, easing, semantic typography) are not Figma Variables. Keep in `tmp/css-only-tokens/` locally; merge into `tokens/` when ready.

---

## Config status

| Status | Meaning |
|---|---|
| `not_initialized` | Run `npm run init` |
| `incomplete` | fileKey set; add `--collections` |
| `invalid` | Fix or re-run init |
| `ok` | Ready |

```bash
npm run config
npm run config -- --json
```

---

## Updating tooling

See **`UPDATING.md`**.

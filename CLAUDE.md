# Figma Integration

## What This Is

Design-token pipeline: DTCG JSON ↔ Figma Variables bidirectional sync.

**Figma is the source of truth.** The `tokens/` tree ships as empty JSON scaffolds — extract from Figma to populate.

---

## Initialize (first-time setup)

The user provides a **Figma file URL**. You discover everything else via MCP.

### Trigger

User says: *"Initialize figma-integration"* (or similar) and pastes a Figma design URL.

### Steps

1. **Parse URL** (no MCP needed):
   ```bash
   npm run parse-url -- "https://www.figma.com/design/FILE_KEY/file-name?node-id=0-1"
   ```
   Returns `fileKey`, `fileName`, `url`, optional `nodeId`.

2. **Ensure Figma MCP is connected** — OAuth via `.cursor/mcp.json`. Load `figma-use` skill before `use_figma`.

3. **Discover variable collections** in that file via `use_figma`:
   ```javascript
   // List local variable collections + modes (adapt if API differs)
   const collections = await figma.variables.getLocalVariableCollectionsAsync();
   return collections.map(c => ({ name: c.name, id: c.id, modes: c.modes.map(m => m.name) }));
   ```
   Use `fileKey` from step 1. If the file is a library, also check `getAvailableLibraryVariableCollectionsAsync()`.

4. **Write config**:
   ```bash
   npm run init -- --url "https://…" --collections Primitives Semantic Components Density Layout
   ```
   Adjust collection names to match what step 3 returned. Order matters for `assemble-figma-export.mjs`.

5. **Verify**:
   ```bash
   npm run config
   ```
   Must show `✅` with fileKey and collections.

6. **Optional — first extraction**: extract variables per collection → `tmp/figma-export/chunks/master/<Collection>.json` → assemble → convert to DTCG.

### Partial init

If collections aren't discovered yet:
```bash
npm run init -- --url "https://…"
```
Status will be `incomplete`. After MCP discovery:
```bash
npm run init -- --merge --collections CollectionA CollectionB
```

### Config files

| File | Committed | Purpose |
|---|---|---|
| `config/figma.defaults.json` | Yes | MCP server names, empty collections |
| `config/figma.json` | No (gitignored) | fileKey, url, collections — generated at init |

---

## How to Start (returning session)

```bash
npm run config    # must be ok before pipeline scripts
npm test          # after Figma export + populated tokens/
```

**Figma MCP:** Remote OAuth — no Figma Desktop required.

1. MCP config: `.cursor/mcp.json`
2. Server: `figma` at `https://mcp.figma.com/mcp`
3. **Skills:** copy from https://github.com/southleft/figma-console-mcp-skills into `.cursor/skills/`
4. Load `figma-use` before every `use_figma` call

---

## Pipeline

| Direction | Tooling |
|---|---|
| Figma → flat export | `use_figma` extract → `assemble-figma-export.mjs` |
| Figma → DTCG files | `figma-export-to-dtcg.mjs` → `tmp/tokens/` → merge to `tokens/` |
| JSON → Figma | `dtcg-to-figma-tokens.mjs` + `use_figma` apply |
| DTCG → CSS | `dtcg-convert.mjs` |
| Parity | `parity-check.mjs`, `compare-token-trees.mjs` |

**CSS-only tokens** (shadows, easing curves, semantic typography) do not come from Figma Variables. Keep them in `tmp/css-only-tokens/` locally and merge into `tokens/` when ready.

---

## Repo Structure

```
config/figma.defaults.json
config/figma.json            gitignored — created at init
tokens/                      empty scaffolds
tmp/figma-export/
tmp/tokens/
tmp/css-only-tokens/
scripts/
```

---

## Config guard

Pipeline scripts call `scripts/lib/load-config.mjs`.

| Status | Meaning |
|---|---|
| `not_initialized` | No `config/figma.json` — run Initialize |
| `incomplete` | fileKey set, collections empty — MCP discovery needed |
| `invalid` | Bad JSON or fileKey |
| `ok` | Ready for pipeline |

Check: `npm run config` or `npm run config -- --json`

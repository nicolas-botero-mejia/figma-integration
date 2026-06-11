# Figma Integration — agent instructions

Tool-agnostic guidance for AI assistants (GitHub Copilot, VS Code, Cursor, etc.) working in this repo.

**CLI is the source of truth.** Do not require a specific editor. All init and validation steps must be achievable with `npm` scripts and `gh`.

---

## What this is

Design-token pipeline: DTCG JSON ↔ Figma Variables bidirectional sync.

**Figma is the source of truth.** The `tokens/` tree ships as empty JSON scaffolds — populate by extracting from Figma.

---

## Clone (GitHub CLI)

```bash
gh repo clone nicolas-botero-mejia/figma-integration
cd figma-integration
npm install
```

---

## Initialize (CLI-first)

The user provides a **Figma file URL**. Collection names come from the Figma file (UI or MCP).

### Step 1 — Parse URL

```bash
npm run parse-url -- "https://www.figma.com/design/FILE_KEY/file-name?node-id=0-1"
```

Returns `fileKey`, `fileName`, `url`, optional `nodeId`. No MCP required.

### Step 2 — Get collection names

**Option A — Figma UI (no MCP):**  
In the Figma file → **Local variables** panel → note each **collection** name (order matters for export).

**Option B — Figma MCP:**  
After OAuth + **`figma-use`** skill installed, run `scripts/mcp-connection-test.js` via **`use_figma`**. Use returned collection names for init. See `docs/figma-mcp-and-skills.md`.

**URL:** Design mode only — not Dev Mode (`?m=dev`). `npm run parse-url` warns if detected.

### Step 3 — Write config

```bash
npm run init -- --url "https://www.figma.com/design/…" --collections Primitives Semantic Components Density Layout
```

Use exact collection names from step 2. Order matters for `assemble-figma-export.mjs`.

### Step 4 — Verify

```bash
npm run config
```

Must exit 0 with `status: ok` (or human-readable ✅).

### Partial init

URL only (collections later):

```bash
npm run init -- --url "https://…"
npm run init -- --merge --collections CollectionA CollectionB
```

### Config files

| File | Committed | Purpose |
|---|---|---|
| `config/figma.defaults.json` | Yes | Shared defaults |
| `config/figma.json` | No (gitignored) | fileKey, url, collections — created by `npm run init` |

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

## Optional: Figma MCP + skills

Required for **variable extract/push** (not for CLI-only init if collection names are known).

| Piece | Bundled in repo? | You install |
|---|---|---|
| MCP server config | Example only | OAuth in editor |
| MCP tools (`use_figma`, etc.) | No | Via Figma MCP after OAuth |
| Agent skills (`figma-use`, …) | **No** | [figma-console-mcp-skills](https://github.com/southleft/figma-console-mcp-skills) |

**`use_figma`** = tool that runs Plugin API code. **`figma-use`** = skill that teaches correct usage — load it before every `use_figma` call.

Full guide: **`docs/figma-mcp-and-skills.md`** (connection test, Design vs Dev Mode URLs).

---

## Repo structure

```
config/figma.defaults.json
config/figma.json            gitignored
tokens/                      empty scaffolds
tmp/figma-export/            local exports
tmp/tokens/                  roundtrip validation
scripts/
AGENTS.md                    this file
docs/setup.md                human setup guide
```

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

See `UPDATING.md` (git fetch/merge from `upstream`).

# Figma Integration

DTCG JSON ↔ Figma Variables bidirectional sync, with CSS/Tailwind output.

Repo: [github.com/nicolas-botero-mejia/figma-integration](https://github.com/nicolas-botero-mejia/figma-integration)

**Figma is the source of truth.** The `tokens/` tree ships as empty JSON scaffolds — populate by extracting from your Figma file.

**Editor-agnostic.** The working layer is the same in every tool: CLI scripts, one MCP server, one OAuth flow, one pipeline. Your editor only changes *how* you install the Figma plugin, run OAuth, and where southleft skills land on disk.

---

## Setup checklist (in order)

Do these steps **in sequence**. Later steps fail if earlier ones are skipped.

```
□ 0. Clone + npm install
□ 1. npm run init:env (or npm run init -- --url "…") — MCP config + hard-install plugin + southleft skills
□ 2. Activate Figma plugin in your editor + complete OAuth (Copilot app: `copilot` CLI)
□ 3. npm run init -- --url "https://…" — project config (skipped if done in step 1 with --url)
□ 4. npm run doctor — verify MCP files + skills on disk
□ 5. MCP connection test — use_figma + figma-use, collections returned
□ 6. Extract → npm run scaffold-components → merge tokens → npm test
```

**`npm run init`** runs **environment setup first** (sync MCP from `.mcp.json`, clone Figma plugin skills + required southleft skills), then writes `config/figma.json` when `--url` is provided.

---

## Step 0 — Clone

```bash
gh repo clone nicolas-botero-mejia/figma-integration
cd figma-integration
npm install
```

---

## Step 1 — Environment (MCP + skills)

Hard-installs **both** skill sets (separate sources — always reinstalled, not optional):

| Source | Skills |
|---|---|
| [figma/mcp-server-guide](https://github.com/figma/mcp-server-guide) | Figma plugin skills (`figma-use`, `figma-generate-design`, …) |
| [southleft/figma-console-mcp-skills](https://github.com/southleft/figma-console-mcp-skills) | `figma-use`, `figma-export-tokens`, `figma-import-tokens`, `figma-manage-variables` |

Southleft installs **after** plugin skills (same folder; token-pipeline `figma-use` wins if names overlap).

```bash
npm run init:env                              # both editors (.github/skills + .cursor/skills)
npm run init:env -- --editor copilot          # Copilot / VS Code only
npm run init:env -- --editor cursor           # Cursor only
```

Requires **network** (git clone). Verify with `npm run doctor`.

---

## Step 2 — Figma plugin + OAuth

Variable extract/push still requires **activating the plugin** in your editor and **OAuth** (not scripted by init).

| Editor | Plugin | OAuth |
|---|---|---|
| **Cursor** | `/add-plugin figma` or `.cursor/plugin.json` | MCP settings |
| **GitHub Copilot / VS Code** | `.github/plugin/plugin.json` | MCP settings |
| **Copilot desktop app** | same | Run `copilot` in terminal (retry if timing fails) |

Confirm **`use_figma`** appears in your MCP tool list after OAuth.

---

## Step 3 — Project config (Figma URL)

```bash
npm run parse-url -- "https://www.figma.com/design/YOUR_KEY/your-file-name"
npm run init -- --url "https://www.figma.com/design/YOUR_KEY/your-file-name"
npm run config          # must show ok
```

Or combine env + config in one command:

```bash
npm run init -- --url "https://www.figma.com/design/YOUR_KEY/your-file-name" --editor copilot
```

Use `--skip-env` to update config only. Use `--env-only` for skills/MCP without touching `config/figma.json`.

**Design-mode URLs only** — avoid `?m=dev`.

**Collections** default from the `tokens/` folder scaffold:

| Folder | Figma collection |
|---|---|
| `primitives/` | Primitives |
| `semantic/` | Semantic |
| `components/` | Components |
| `density/` | Density |
| `layout/` | Layout |

Override if your Figma file uses different names:

```bash
npm run init -- --url "https://…" --collections YourCollectionA YourCollectionB
```

Partial init (collections later):

```bash
npm run init -- --url "https://…"
npm run init -- --merge --collections CollectionA CollectionB
```

### Config status

| Status | Meaning |
|---|---|
| `not_initialized` | Run `npm run init` |
| `incomplete` | fileKey set; add `--collections` |
| `invalid` | Fix or re-run init |
| `ok` | Ready for pipeline scripts |

```bash
npm run config
npm run config -- --json
```

### Config files

| File | Committed | Purpose |
|---|---|---|
| `config/figma.defaults.json` | Yes | Shared defaults |
| `config/figma.json` | No (gitignored) | fileKey, url, collections — created by `npm run init` |
| `config/mcp.example.json` | Yes | MCP config for editors without bundled manifests |

---

## Step 4 — Connection test

Run after **Steps 1–3** (env, OAuth, project config).

**A. Local config**

```bash
npm run config    # must show fileKey + collections
```

**B. Plugin API test** — ask your AI assistant to run `scripts/mcp-connection-test.js` via **`use_figma`** with **`figma-use`** loaded:

```javascript
const collections = await figma.variables.getLocalVariableCollectionsAsync();
return {
  ok: true,
  fileName: figma.root.name,
  collectionCount: collections.length,
  collections: collections.map((c) => c.name),
};
```

**Pass:** `ok: true`, file name matches, collections match `npm run init`.

| Symptom | Fix |
|---|---|
| Auth / 401 | Step 2 — re-run OAuth (`copilot` for Copilot app) |
| `use_figma` not found | Step 1 — install Figma plugin |
| Script errors / timeouts | Re-run `npm run init:env` — load southleft `figma-use` before `use_figma` |
| Wrong / empty file | Design-mode URL; check `config/figma.json` fileKey |

---

## Step 5 — Token pipeline

1. Export variables from Figma via MCP → `tmp/figma-export/chunks/master/`
2. `node scripts/assemble-figma-export.mjs master tmp/figma-export/master-vars.json`
3. `node scripts/figma-export-to-dtcg.mjs` → merge `tmp/tokens/` into `tokens/`
4. `npm run scaffold-components` — one `tokens/components/{prefix}.json` per Figma group (`*` prefixes ignored)
5. Copy CSS-only tokens from `tmp/css-only-tokens/` when ready
6. `npm test`

| Direction | Tooling |
|---|---|
| Figma → flat export | MCP extract → `assemble-figma-export.mjs` |
| Figma → DTCG | `figma-export-to-dtcg.mjs` → `tmp/tokens/` → `tokens/` |
| DTCG → Figma | `dtcg-to-figma-tokens.mjs` + MCP apply |
| DTCG → CSS | `dtcg-convert.mjs` |
| Parity | `parity-check.mjs`, `compare-token-trees.mjs` |

---

## Commands

```bash
npm run config
npm run init:env
npm run init -- --url "https://…"
npm run doctor
npm run scaffold-components
npm test
```

---

## Repo layout

```
config/
  figma.defaults.json      committed defaults
  figma.json               generated at init (gitignored)
  mcp.example.json         MCP config for other editors

tokens/
  primitives/ …            topic JSON files
  semantic/ …
  components/              one JSON per Figma component group (from scaffold-components)
  density/ …
  layout/ …
tmp/                       local only (gitignored)
  figma-export/            flat export + per-collection chunks
  tokens/                  roundtrip validation output
  css-only-tokens/         shadows, easing, typography (merge when ready)

scripts/                   pipeline + init tooling (see table below)

.cursor/plugin.json        Cursor Figma plugin manifest
.github/plugin/plugin.json GitHub Copilot Figma plugin manifest
.mcp.json                  Figma MCP config (root)
.github/mcp.json           Figma MCP (Copilot / VS Code)
.cursor/mcp.json           Figma MCP (Cursor)
.github/skills/            southleft skills install target (Copilot)
.cursor/skills/            southleft skills install target (Cursor)

AGENTS.md                  agent instructions (AI assistants)
UPDATING.md                pull tooling updates from upstream
```

### Scripts

| Script | Purpose |
|---|---|
| `check-config.mjs` | Config status (`npm run config`) |
| `init-config.mjs` | Env + project init (`npm run init`) |
| `init-env.mjs` | MCP sync + hard-install skills (`npm run init:env`) |
| `doctor.mjs` | Verify MCP files + skills (`npm run doctor`) |
| `scaffold-components.mjs` | `tokens/components/{prefix}.json` from export |
| `parse-figma-url.mjs` | Parse Figma URL → fileKey (`npm run parse-url`) |
| `assemble-figma-export.mjs` | Per-collection chunks → single export JSON |
| `figma-export-to-dtcg.mjs` | `master-vars.json` → `tmp/tokens/` |
| `dtcg-to-figma-tokens.mjs` | DTCG JSON → TOKENS array for Figma push |
| `parity-check.mjs` | Flat compare `tokens/` ↔ Figma export |
| `compare-token-trees.mjs` | Structural compare `tokens/` ↔ `tmp/tokens/` |
| `dtcg-convert.mjs` | DTCG → CSS vars / Tailwind v4 |
| `mcp-connection-test.js` | Snippet — run via `use_figma` to verify OAuth + file access |

---

## Updating tooling

See **`UPDATING.md`**.

---

## AI assistants

Operational instructions for agents: **`AGENTS.md`**.

When initializing via an agent: complete README Steps 1–3 (plugin, OAuth, southleft skills) before extract; then `npm run parse-url` → `npm run init` → `npm run config` → connection test.

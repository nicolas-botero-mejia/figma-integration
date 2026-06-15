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
□ 1. Install Figma MCP plugin (editor-specific — see below)
□ 2. Authenticate Figma MCP (OAuth — includes Copilot CLI if using GitHub Copilot app)
□ 3. Install agent skills from southleft/figma-console-mcp-skills (not bundled here)
□ 4. Copy Figma URL from Design mode (not Dev Mode)
□ 5. npm run parse-url → npm run init → npm run config
□ 6. MCP connection test — use_figma + figma-use skill, collections returned
□ 7. Extract variables → tmp/figma-export/ → npm test
```

---

## Step 0 — Clone

```bash
gh repo clone nicolas-botero-mejia/figma-integration
cd figma-integration
npm install
```

---

## Step 1 — Install Figma MCP plugin

Variable extract/push needs the official [Figma MCP plugin](https://github.com/figma/mcp-server-guide). This repo ships plugin manifests and MCP config; you still must **activate the plugin** in your editor.

| Editor | How to install |
|---|---|
| **Cursor** | `/add-plugin figma` in agent chat (manifest: `.cursor/plugin.json`) |
| **GitHub Copilot / VS Code** | Install from `.github/plugin/plugin.json` |
| **Other** | Copy `config/mcp.example.json` into your editor's MCP settings |

After install, confirm **`use_figma`** appears in your MCP tool list. Read-only tools alone (`get_design_context`, `get_metadata`, …) are **not** enough for this pipeline.

---

## Step 2 — Authenticate Figma MCP

Complete Figma OAuth so MCP server `https://mcp.figma.com/mcp` shows **connected / authenticated** in your editor.

### GitHub Copilot app — Copilot CLI required

The **GitHub Copilot desktop app** does **not** include **Copilot CLI**. Figma MCP OAuth for Copilot often **only works after CLI auth**:

1. [Install GitHub Copilot CLI](https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli) if you don't have it.
2. Open a terminal and run:

   ```bash
   copilot
   ```

3. Complete the browser sign-in / OAuth flow when prompted.
4. **Retry if auth fails** — the OAuth window is timing-sensitive. Run `copilot` again and complete sign-in promptly if the first attempt doesn't stick.
5. Return to your editor and confirm Figma MCP is connected.

### All editors

| Symptom | Fix |
|---|---|
| Auth / 401 / not connected | Re-run OAuth (`copilot` for Copilot app, or MCP settings in Cursor / VS Code) |
| `use_figma` not in tool list | Re-check Step 1 — plugin not fully installed |

---

## Step 3 — Install agent skills (required)

**Skills are not bundled in this repo** and are **not optional** for reliable extract/push. The Figma plugin gives you MCP tools; the **southleft** skills teach the AI how to use them correctly.

Install from [southleft/figma-console-mcp-skills](https://github.com/southleft/figma-console-mcp-skills):

```bash
git clone https://github.com/southleft/figma-console-mcp-skills.git /tmp/figma-skills
cp -R /tmp/figma-skills/skills/figma-use .github/skills/figma-use
```

| Editor | Copy skills to |
|---|---|
| **GitHub Copilot / VS Code** | `.github/skills/` |
| **Cursor** | `.cursor/skills/` |

**Minimum (required):** `figma-use` — load before **every** `use_figma` call.

**Optional (token pipeline):** `figma-export-tokens`, `figma-import-tokens`, `figma-manage-variables` from the same repo.

Without Step 3, `use_figma` calls often fail in hard-to-debug ways even when OAuth succeeds.

### MCP vs skills vs tools

| | What it is |
|---|---|
| **Figma MCP server** | Remote server at `https://mcp.figma.com/mcp` — OAuth in Step 2 |
| **`use_figma`** | MCP **tool** — runs Plugin API JavaScript (export/push variables) |
| **`figma-use`** | Agent **skill** from southleft — teaches correct `use_figma` scripts |

---

## Step 4 — Initialize (CLI)

```bash
npm run parse-url -- "https://www.figma.com/design/YOUR_KEY/your-file-name"
npm run init -- --url "https://www.figma.com/design/YOUR_KEY/your-file-name"
npm run config          # must show ok
```

**Design-mode URLs only** — copy in Design mode, not Dev Mode. Avoid `?m=dev`. `npm run parse-url` warns on Dev Mode links.

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

## Step 5 — Connection test

Run only after **Steps 1–4** (plugin, OAuth, skills, init).

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
| Script errors / timeouts | Step 3 — install `figma-use` skill |
| Wrong / empty file | Design-mode URL; check `config/figma.json` fileKey |

---

## Step 6 — Token pipeline

1. Export variables from Figma via MCP → `tmp/figma-export/chunks/master/`
2. `node scripts/assemble-figma-export.mjs master tmp/figma-export/master-vars.json`
3. `node scripts/figma-export-to-dtcg.mjs` → merge `tmp/tokens/` into `tokens/`
4. Copy CSS-only tokens from `tmp/css-only-tokens/` when ready (shadows, easing, semantic typography — not Figma Variables)
5. `npm test`

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
npm run config          # config status
npm run parse-url -- "https://www.figma.com/design/…"
npm run init -- --url "https://…"
npm test                # after Figma export + populated tokens/
```

---

## Repo layout

```
config/
  figma.defaults.json      committed defaults
  figma.json               generated at init (gitignored)
  mcp.example.json         MCP config for other editors

tokens/                    empty DTCG scaffolds → populated from Figma
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
| `init-config.mjs` | Write `config/figma.json` (`npm run init`) |
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

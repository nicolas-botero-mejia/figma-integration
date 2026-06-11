# Figma MCP, skills, and connection test

This repo **does not bundle** Figma MCP or agent skills. You install both in your editor, then verify the connection before running the token pipeline.

---

## Three separate things (often confused)

| | What it is | In this repo? | Comes with Figma MCP OAuth? |
|---|---|---|---|
| **1. Figma MCP server** | Remote server at `https://mcp.figma.com/mcp` — OAuth to your Figma account | Example config only (`.vscode/mcp.json`, `config/mcp.example.json`) | You connect it in your editor |
| **2. MCP tools** | What the server exposes after auth — e.g. `get_metadata`, `get_design_context`, **`use_figma`** | No | **Partially** — see below |
| **3. Agent skills** | Instruction files (e.g. **`figma-use`**) that teach the AI *how* to call `use_figma` correctly | **No — you install separately** | **No — never bundled** |

### `use_figma` vs `figma-use`

These are **not the same thing**:

- **`use_figma`** — an **MCP tool**. Runs JavaScript in your Figma file via the **Plugin API** (list variables, export tokens, push tokens, etc.). Required for this pipeline’s Figma ↔ JSON sync.
- **`figma-use`** — an **agent skill** (markdown instructions + reference docs). Does not execute anything. Tells the AI the rules for writing `use_figma` scripts (return values, await fonts, variable scopes, etc.). **Without it, `use_figma` calls often fail in hard-to-debug ways.**

Some hosts expose read-only MCP tools without `use_figma`. This project needs **`use_figma`** (or an equivalent Plugin API runner) for variable extract/push.

### Read-only vs Plugin API tools

After OAuth, Figma MCP typically gives you **read/context tools** (selection metadata, design context, screenshots). Those are **not** enough to export Variables.

For Variables you need **Plugin API execution** — in practice the **`use_figma`** tool. Check your editor’s MCP tool list after connecting.

---

## Install (in order)

### 1. Connect Figma MCP + authenticate

1. Add the server to your editor (see table below).
2. Restart the editor if required.
3. Complete **Figma OAuth** when prompted (sign in, grant access).
4. Confirm the MCP server shows **connected / authenticated** in your editor.

| Editor | Config in this repo |
|---|---|
| VS Code / GitHub Copilot | `.vscode/mcp.json` |
| Cursor | `.cursor/mcp.json` |
| Other | Copy `config/mcp.example.json` |

Server URL (all hosts):

```json
{
  "mcpServers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

### 2. Install agent skills (not in this repo)

Skills are **required** for reliable `use_figma` usage. Install into your editor’s skills folder:

```bash
git clone https://github.com/southleft/figma-console-mcp-skills.git /tmp/figma-skills
```

| Editor | Copy skills to |
|---|---|
| Cursor | `.cursor/skills/` (create if missing) |
| VS Code + Copilot | Follow your host’s skill / instruction mechanism; at minimum ensure **`AGENTS.md`** and **`.github/copilot-instructions.md`** are loaded |

Minimum skill for this pipeline:

```bash
cp -R /tmp/figma-skills/skills/figma-use .cursor/skills/figma-use
```

Optional (token import/export): `figma-export-tokens`, `figma-import-tokens`, `figma-manage-variables` from the same repo.

**Before every `use_figma` call**, the agent must load **`figma-use`** (where your host supports skills). On Cursor this is often via `skillNames: "figma-use"` on the tool call.

### 3. Use a Design-mode URL (not Dev Mode)

Copy the link **while in Design mode**, not Dev Mode.

| ✅ Good | ❌ Avoid |
|---|---|
| `https://www.figma.com/design/FILE_KEY/file-name` | URLs with `?m=dev` (Dev Mode) |
| Copy via **Share** or address bar in Design | Dev Mode “Copy link” when inspecting a node |

Dev Mode links often break MCP file context or return the wrong scope. If your URL contains `m=dev`, open the file in **Design** mode and copy again.

`npm run parse-url` warns when it detects Dev Mode query params.

### 4. Initialize local config (CLI)

MCP auth ≠ project config. Still run:

```bash
npm run parse-url -- "https://www.figma.com/design/…"
npm run init -- --url "https://…" --collections Primitives Semantic …
npm run config
```

---

## Connection test (run after steps 1–2)

Goal: prove **OAuth works**, **`use_figma` is available**, and you can **read the target file**.

### A. Local config (no MCP)

```bash
npm run config
```

Must show `✅` with your `fileKey` and `collections`.

### B. MCP auth smoke test

Use whatever lightweight tool your host lists after OAuth — e.g. a “who am I” or file metadata call. If the call fails with auth errors, fix OAuth before continuing.

### C. Plugin API test (requires `use_figma` + `figma-use` skill)

Ask your AI assistant to run **`use_figma`** against your file with the **`figma-use`** skill loaded, using the **`fileKey`** from `npm run parse-url`:

```javascript
// Connection test — list variable collections in the open file
const collections = await figma.variables.getLocalVariableCollectionsAsync();
return {
  ok: true,
  fileName: figma.root.name,
  collectionCount: collections.length,
  collections: collections.map((c) => c.name),
};
```

**Pass criteria:**

- Returns `ok: true`
- `fileName` matches your design system file
- `collections` matches names you used in `npm run init` (or tells you what to put in `--collections`)

**Fail criteria → what to check:**

| Symptom | Likely fix |
|---|---|
| Auth / 401 / not connected | Re-run Figma OAuth in editor MCP settings |
| `use_figma` tool not found | Enable Figma MCP Plugin API tools in your host; Cursor users may need the Figma plugin integration |
| Wrong or empty file | Use **Design mode** URL; verify `fileKey` in `config/figma.json` |
| Script errors / timeouts | Load **`figma-use`** skill before calling `use_figma` |
| Permission denied on file | Your Figma account needs access to that file |

A copy of this script lives at **`scripts/mcp-connection-test.js`** — paste into `use_figma` via your agent.

---

## Recommended setup order (checklist)

```
□ Clone repo + npm install
□ Add Figma MCP server config to editor
□ Figma OAuth — MCP shows connected
□ Install figma-use skill (and optional token skills)
□ Copy Figma URL from Design mode (not Dev Mode)
□ npm run parse-url — no dev-mode warning
□ npm run init + npm run config — ✅
□ MCP connection test (use_figma script above) — collections returned
□ Extract variables → tmp/figma-export/ → npm test
```

---

## Where skills live vs what this repo ships

```
figma-integration/          ← you clone this (scripts, empty tokens, docs)
  .cursor/skills/           ← NOT shipped — you copy skills here (Cursor)
  .vscode/mcp.json          ← MCP server URL example only
  scripts/mcp-connection-test.js  ← test snippet for use_figma

southleft/figma-console-mcp-skills   ← separate install (figma-use, etc.)
Figma MCP (mcp.figma.com)            ← separate OAuth in your editor
```

Skills are **not** optional for serious `use_figma` work — treat them like a dependency you install once per machine/editor profile.

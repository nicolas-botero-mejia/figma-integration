# Setup

Works with **GitHub CLI**, **GitHub Copilot** (VS Code / Copilot app), or any editor.

**Full MCP + skills guide:** [`docs/figma-mcp-and-skills.md`](figma-mcp-and-skills.md)

---

## 1. Clone

```bash
gh repo clone nicolas-botero-mejia/figma-integration
cd figma-integration
npm install
```

---

## 2. Figma MCP + skills (install before extract/push)

This repo ships **neither** the MCP server nor agent skills — only example config and docs.

### 2a. Connect Figma MCP

1. Use `.vscode/mcp.json` (VS Code / Copilot) or `.cursor/mcp.json` (Cursor) — server `https://mcp.figma.com/mcp`
2. Restart editor → complete **Figma OAuth**
3. Confirm MCP shows **authenticated**

### 2b. Install skills (required for `use_figma`)

```bash
git clone https://github.com/southleft/figma-console-mcp-skills.git /tmp/figma-skills
mkdir -p .cursor/skills   # Cursor; adapt path for your host
cp -R /tmp/figma-skills/skills/figma-use .cursor/skills/figma-use
```

Minimum: **`figma-use`**. Optional: `figma-export-tokens`, `figma-import-tokens`.

**`use_figma`** = MCP tool (runs Plugin API code). **`figma-use`** = skill (teaches the AI how to use that tool). They are not bundled together — see [`docs/figma-mcp-and-skills.md`](figma-mcp-and-skills.md).

### 2c. Connection test

After OAuth + skills:

1. `npm run config` — local config ✅
2. Run `scripts/mcp-connection-test.js` via **`use_figma`** (with **`figma-use`** loaded) — must return your file name + collection list

Details: [`docs/figma-mcp-and-skills.md` § Connection test](figma-mcp-and-skills.md#connection-test-run-after-steps-12)

---

## 3. Initialize config (CLI)

### Figma URL — Design mode only

Copy the link in **Design mode**, not Dev Mode. Avoid `?m=dev` in the URL.

```bash
npm run parse-url -- "https://www.figma.com/design/YOUR_KEY/your-file-name"
# ⚠️ warns if Dev Mode detected
```

### Run init

Collections default from **`tokens/` folders** (see `tokens/README.md`):

```bash
npm run init -- --url "https://www.figma.com/design/YOUR_KEY/your-file-name"
npm run config
```

Override if your Figma collections are named differently:

```bash
npm run init -- --url "https://…" --collections YourCollectionA YourCollectionB
```

---

## 4. Populate tokens

1. Export variables from Figma via MCP → `tmp/figma-export/chunks/master/`
2. `node scripts/assemble-figma-export.mjs master tmp/figma-export/master-vars.json`
3. `node scripts/figma-export-to-dtcg.mjs` → merge `tmp/tokens/` into `tokens/`
4. `npm test`

---

## 5. AI assistants

| File | Audience |
|---|---|
| `AGENTS.md` | Any AI agent |
| `.github/copilot-instructions.md` | GitHub Copilot |
| `docs/figma-mcp-and-skills.md` | MCP, skills, connection test |

When asking Copilot to initialize: provide a **Design-mode** Figma URL; agent runs `npm run parse-url` → `npm run init` → `npm run config`, then MCP connection test before extract.

# Figma Integration

DTCG JSON ↔ Figma Variables bidirectional sync, with CSS/Tailwind output.

Repo: [github.com/nicolas-botero-mejia/figma-integration](https://github.com/nicolas-botero-mejia/figma-integration)

**Figma is the starting point.** Token JSON files ship empty — populate them by extracting from your Figma file.

**Editor-agnostic:** CLI + GitHub CLI for setup; works with GitHub Copilot, VS Code, Cursor, or terminal-only.

## Setup

```bash
gh repo clone nicolas-botero-mejia/figma-integration
cd figma-integration
npm install
```

### Initialize

```bash
npm run parse-url -- "https://www.figma.com/design/YOUR_KEY/your-file-name"
npm run init -- \
  --url "https://www.figma.com/design/YOUR_KEY/your-file-name" \
  --collections Primitives Semantic Components Density Layout
npm run config
```

Collection names: Figma → **Local variables** panel (each tab = one collection).  
Setup: **`docs/setup.md`** · MCP + skills: **`docs/figma-mcp-and-skills.md`**

Use a **Design-mode** URL (not Dev Mode `?m=dev`). MCP + **`figma-use`** skill required for extract/push — install separately.

## Commands

```bash
npm run config          # status: not_initialized | incomplete | ok
npm run parse-url -- "https://www.figma.com/design/…"
npm run init -- --url "https://…" --collections Primitives Semantic …
npm test                # after Figma export + populated tokens/
```

## Layout

```
config/figma.defaults.json   committed defaults
config/figma.json            generated at init (gitignored)
tokens/                      empty scaffolds — populated from Figma
tmp/figma-export/            local Figma exports (gitignored)
scripts/                     pipeline + init tooling
docs/setup.md                setup guide
docs/figma-mcp-and-skills.md MCP OAuth, skills, connection test
AGENTS.md                    instructions for AI assistants
.github/copilot-instructions.md   GitHub Copilot
```

## Workflow

1. **Initialize** — `npm run init` (see `docs/setup.md`)
2. Extract variables from Figma → `tmp/figma-export/chunks/`
3. `node scripts/assemble-figma-export.mjs master tmp/figma-export/master-vars.json`
4. `node scripts/figma-export-to-dtcg.mjs` → merge into `tokens/`
5. Copy CSS-only tokens from `tmp/css-only-tokens/` when ready
6. `npm test`

## Updating tooling

See **`UPDATING.md`**.

## AI assistants

- **GitHub Copilot:** `.github/copilot-instructions.md`
- **Any agent:** `AGENTS.md`

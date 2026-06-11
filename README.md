# Figma Integration

DTCG JSON ↔ Figma Variables bidirectional sync, with CSS/Tailwind output.

Repo: [github.com/nicolas-botero-mejia/figma-integration](https://github.com/nicolas-botero-mejia/figma-integration)

**Figma is the starting point.** Token JSON files ship empty — populate them by extracting from your Figma file.

## Setup

```bash
npm install   # no runtime deps — scripts are zero-dep Node
```

1. Open in **Cursor** — Figma MCP OAuth (`.cursor/mcp.json` is preconfigured).
2. Paste your **Figma file URL** in chat and ask: **"Initialize figma-integration"**
3. The agent discovers collections via MCP and writes `config/figma.json` (local, gitignored).
4. **Skills:** copy from [southleft/figma-console-mcp-skills](https://github.com/southleft/figma-console-mcp-skills) into `.cursor/skills/`.

Verify: `npm run config`

## Commands

```bash
npm run config          # status: not_initialized | incomplete | ok
npm run parse-url -- "https://www.figma.com/design/…"
npm run init -- --url "https://…" --collections Primitives Semantic …
npm test                # after Figma export + populated tokens/
```

## Layout

```
config/figma.defaults.json   committed MCP defaults
config/figma.json            generated at init (gitignored)
tokens/                      empty scaffolds — populated from Figma
tmp/figma-export/            local Figma exports (gitignored)
scripts/                     pipeline + init tooling
```

## Workflow

1. **Initialize** — URL in chat → agent writes config (see `CLAUDE.md` §Initialize)
2. Extract variables from Figma via MCP → `tmp/figma-export/chunks/`
3. `node scripts/assemble-figma-export.mjs master tmp/figma-export/master-vars.json`
4. `node scripts/figma-export-to-dtcg.mjs` → merge into `tokens/`
5. Copy CSS-only tokens from `tmp/css-only-tokens/` when ready
6. `npm test`

## Updating tooling

When scripts or docs change upstream, see **`UPDATING.md`** (git fetch/merge from `upstream`).

Session context: `CLAUDE.md`.

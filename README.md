# Figma Integration

DTCG JSON ↔ Figma Variables bidirectional sync, with CSS/Tailwind output.

Repo: [github.com/nicolas-botero-mejia/figma-integration](https://github.com/nicolas-botero-mejia/figma-integration)

**Figma:** [REDY Design System](https://www.figma.com/design/vuoYR8rDz1O27OsqmQfd84/REDY-Design-System?node-id=73443-2&m=dev) · key `vuoYR8rDz1O27OsqmQfd84` (`config/figma.json`)

## Setup

```bash
npm install   # no runtime deps — scripts are zero-dep Node
```

**MCP:** `.cursor/mcp.json` — restart Cursor, Figma OAuth. Optional: `/add-plugin figma`.

**Skills:** copy from [southleft/figma-console-mcp-skills](https://github.com/southleft/figma-console-mcp-skills):

```bash
git clone https://github.com/southleft/figma-console-mcp-skills.git /tmp/figma-skills
cp -R /tmp/figma-skills/skills/* .cursor/skills/
```

## Commands

```bash
npm test
node scripts/dtcg-to-figma-tokens.mjs --mode Value tokens/primitives/color.json
node scripts/figma-export-to-dtcg.mjs
node scripts/dtcg-convert.mjs tokens/primitives/motion.json --format css-vars
```

## Layout

```
config/figma.json       Figma file key + URL
tokens/                 Source DTCG JSON
tmp/figma-export/       Figma variable exports (master-vars.json + chunks)
tmp/tokens/             Reconstructed DTCG from Figma (validation)
tmp/session-findings.md Session log
scripts/                Pipeline tooling
```

Session context: `CLAUDE.md`, `tmp/session-findings.md`.

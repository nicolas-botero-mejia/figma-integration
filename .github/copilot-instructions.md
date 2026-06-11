# Copilot instructions

CLI-first setup. **Read `docs/figma-mcp-and-skills.md`** for MCP OAuth, skills install, and connection test.

## Before Figma variable work

1. User must have **Figma MCP OAuth** complete in this editor.
2. User must install **`figma-use`** skill (not in this repo) — from [southleft/figma-console-mcp-skills](https://github.com/southleft/figma-console-mcp-skills).
3. Run **connection test** (`scripts/mcp-connection-test.js` via `use_figma` with `figma-use` loaded) before extract/push.

**`use_figma`** = MCP tool. **`figma-use`** = skill (instructions). Neither is bundled in this repo.

## Figma URLs

Use **Design mode** links (`figma.com/design/…`). **Not Dev Mode** (`?m=dev`) — re-copy from Design mode if `npm run parse-url` warns.

## Initialize

1. `npm run parse-url -- "<url>"` — check for dev-mode warning
2. Get collection names (user, Figma UI, or `use_figma` test script)
3. `npm run init -- --url "<url>" --collections …`
4. `npm run config` — must pass
5. MCP connection test — collections returned must match config

## Key commands

```bash
gh repo clone nicolas-botero-mejia/figma-integration
npm run config
npm run parse-url -- "<figma-url>"
npm run init -- --url "<figma-url>" --collections Primitives Semantic …
npm test
```

## Private (never commit)

- `config/figma.json`
- `tmp/figma-export/`, `tmp/tokens/`, `tmp/css-only-tokens/`

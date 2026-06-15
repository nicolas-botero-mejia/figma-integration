# Changelog

All notable changes to the **tooling layer** (`scripts/`, config defaults, docs) are documented here.

Project data (`tokens/`, `config/figma.json`, `tmp/`) is local to your clone — not versioned in upstream releases.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

- Consolidated setup into single **`README.md`**; removed `docs/setup.md`, `docs/figma-mcp-and-skills.md`, and scattered folder READMEs
- Added official Figma plugin manifests (`.cursor/plugin.json`, `.github/plugin/`) and root **`.mcp.json`**
- Enriched MCP config (`type: http`, tool titles) in `.github/mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`
- **`README.md`**: ordered setup (plugin → OAuth → southleft skills → init → connection test); Copilot CLI auth caveat
- **`UPDATING.md`**: post-update verification for MCP, plugin, and skills in your editor environment
- **`AGENTS.md`**: slim agent instructions; human setup deferred to README
- CLI-first init; collections auto-derived from `tokens/` scaffold
- Removed `.github/copilot-instructions.md` and `CLAUDE.md`
- Added `scripts/mcp-connection-test.js`, Dev Mode URL warning in `parse-url`

## [1.0.0] - 2026-06-11

### Added

- Vanilla clone template: empty `tokens/` scaffolds, Figma-first workflow
- MCP-driven init: `npm run parse-url`, `npm run init`, `npm run config`
- Split config: `config/figma.defaults.json` (committed) + `config/figma.json` (gitignored, generated at init)
- Config guard in pipeline scripts (`scripts/lib/load-config.mjs`)
- `UPDATING.md` — git clone update guide

### Removed

- Client-specific Figma exports and session artifacts from the public repo
- CSS-only token files from `tokens/` (shadow, motion-easing, typography) — merge locally from `tmp/css-only-tokens/` when needed

[1.0.0]: https://github.com/nicolas-botero-mejia/figma-integration/releases/tag/v1.0.0

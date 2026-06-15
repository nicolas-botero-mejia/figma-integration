# Changelog

All notable changes to the **tooling layer** (`scripts/`, config defaults, docs) are documented here.

Project data (`tokens/`, `config/figma.json`, `tmp/`) is local to your clone — not versioned in upstream releases.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

### Changed

- **`npm run init`** now wires MCP + hard-installs Figma plugin skills and required southleft skills before project config
- Added **`npm run init:env`**, **`npm run doctor`**, **`npm run scaffold-components`**
- Components routing: one JSON per Figma group (`components/{prefix}.json`); ignore `*` prefixes
- Fixed Windows/OneDrive ROOT path in assemble, export, parity, compare scripts
- Consolidated setup into single **`README.md`**; removed scattered docs and folder READMEs
- Added Figma plugin manifests and enriched MCP config
- **`UPDATING.md`**: post-update MCP/skills verification

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

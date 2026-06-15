# Updating tooling

This repo is designed to be **cloned per design system**. Tooling and project data live in the same git tree but have different lifecycles.

| Layer | Paths | Updated via |
|---|---|---|
| **Tooling** | `scripts/`, `config/figma.defaults.json`, `package.json`, MCP/plugin manifests, docs | Pull from upstream |
| **Environment** | Figma OAuth, Copilot CLI auth, southleft skills in `.github/skills/` or `.cursor/skills/` | Local — verify after every tooling update |
| **Project** | `tokens/`, `config/figma.json`, `tmp/` | Your Figma file / local work |

Read `VERSION` (or `package.json` version) to see which tooling release you have.

---

## First-time setup (project clone)

After cloning for a new design system:

```bash
git remote rename origin upstream   # optional — if this IS the upstream repo, skip
# OR, if you cloned into your own repo:
git remote add upstream https://github.com/nicolas-botero-mejia/figma-integration.git
```

Most projects use **origin** = your design-system repo, **upstream** = figma-integration tooling.

---

## Check for updates

```bash
git fetch upstream
git log HEAD..upstream/master --oneline   # commits you're missing
cat VERSION                               # your current tooling version
```

Compare with [GitHub releases](https://github.com/nicolas-botero-mejia/figma-integration/releases) or tags:

```bash
git tag -l 'v*' upstream
```

---

## Apply an update

```bash
git fetch upstream
git merge upstream/master
```

If there are **no conflicts**, run the [After updating](#after-updating) checks — `npm run config` alone is not enough when scripts or MCP config changed.

### If there are conflicts

| Path | Keep |
|---|---|
| `scripts/` | **Upstream** (theirs) — unless you intentionally patched a script locally |
| `config/figma.defaults.json` | **Upstream** — then re-run `npm run init -- --merge` if collections changed |
| `package.json` | **Upstream** for `scripts` section; keep your repo metadata if this is a fork |
| `README.md`, `AGENTS.md`, `UPDATING.md` | **Upstream** |
| `tokens/` | **Yours** — populated from Figma; never overwrite with empty scaffolds |
| `config/figma.json` | **Yours** — gitignored; merge won't touch it |
| `tmp/` | **Yours** — gitignored |

Accept upstream for a single path:

```bash
git checkout --theirs scripts/
git add scripts/
```

Keep your tokens:

```bash
git checkout --ours tokens/
git add tokens/
```

Then finish the merge:

```bash
git commit
```

---

## After updating

Updates can change `scripts/`, MCP config (`.mcp.json`, `.github/mcp.json`, plugin manifests), or docs. **Your editor environment is not updated automatically** — verify the full stack in the editor you actually use.

### 1. Read the changelog

Read `CHANGELOG.md` for breaking changes or new commands.

### 2. CLI sanity check

```bash
npm run config    # must still pass
npm test          # if you have a Figma export and populated tokens/
```

If `figma.defaults.json` changed, compare with your local `config/figma.json` and merge new fields if needed (`npm run init -- --merge`).

### 3. Verify MCP + plugin layer (your editor)

If the merge touched **any** of these paths, re-check MCP in **your** environment (Cursor, GitHub Copilot app, or VS Code — they behave differently):

- `.mcp.json`, `.github/mcp.json`, `.cursor/mcp.json`
- `.github/plugin/`, `.cursor/plugin.json`
- `config/mcp.example.json`

| Check | How |
|---|---|
| Figma plugin still active | Plugin / MCP panel shows Figma connected |
| OAuth still valid | Re-auth if needed — **Copilot app:** run `copilot` in terminal (may take several tries; OAuth window is timing-sensitive) |
| `use_figma` tool listed | Without it, extract/push scripts cannot run |
| Connection test | Run `scripts/mcp-connection-test.js` via `use_figma` — must return collections |

### 4. Verify agent skills

Skills are **local to your machine**, not in git. Upstream updates do not refresh them, but MCP/plugin changes can break skill loading.

Confirm **`figma-use`** is still installed from [southleft/figma-console-mcp-skills](https://github.com/southleft/figma-console-mcp-skills) in `.github/skills/` or `.cursor/skills/`. Re-copy if missing.

### 5. Multi-editor teams

If your team uses **more than one editor**, each person should run steps 3–4 in **their** editor after an update. A passing `npm run config` in terminal does **not** prove MCP works in Copilot vs Cursor.

---

## Pin to a specific release

To update to a tagged version instead of latest `master`:

```bash
git fetch upstream tag v1.0.0
git merge v1.0.0
```

---

## What upstream will never overwrite

These are gitignored — safe during any merge:

- `config/figma.json`
- `tmp/figma-export/`
- `tmp/tokens/`
- `tmp/css-only-tokens/`
- `tmp/session-findings.md`

---

## Reporting issues

If an update breaks your workflow, open an issue on [figma-integration](https://github.com/nicolas-botero-mejia/figma-integration) with:

- Your `VERSION`
- The upstream commit or tag you merged
- **Editor** (Cursor, Copilot app, VS Code)
- Whether `npm run config` and the MCP connection test pass
- Whether `tokens/` is populated

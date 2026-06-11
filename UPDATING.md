# Updating tooling

This repo is designed to be **cloned per design system**. Tooling and project data live in the same git tree but have different lifecycles.

| Layer | Paths | Updated via |
|---|---|---|
| **Tooling** | `scripts/`, `config/figma.defaults.json`, `package.json`, docs | Pull from upstream |
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

If there are **no conflicts**, you're done. Run `npm run config` and spot-check any scripts you use often.

### If there are conflicts

| Path | Keep |
|---|---|
| `scripts/` | **Upstream** (theirs) — unless you intentionally patched a script locally |
| `config/figma.defaults.json` | **Upstream** — then re-run `npm run init -- --merge` if collections changed |
| `package.json` | **Upstream** for `scripts` section; keep your repo metadata if this is a fork |
| `README.md`, `CLAUDE.md`, `UPDATING.md` | **Upstream** |
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

1. Read `CHANGELOG.md` for breaking changes or new commands
2. `npm run config` — config must still pass
3. If `figma.defaults.json` changed, compare with your local `config/figma.json` and merge new fields if needed
4. Re-run `npm test` if you have a Figma export and populated tokens

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
- Whether `tokens/` is populated

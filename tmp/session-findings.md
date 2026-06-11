# Session Findings Log

Running log of discoveries, constraints, and decisions from active sessions.
Append new entries at the top — newest first.
Each entry: date · topic · what we found · impact · any file changed.

---

## 2026-06-04 — Parity closure + documentation (Phase B + C complete)

### F23 — 100% parity achieved — session complete

- **Date:** 2026-06-04
- **Final parity:** 794/794 (100%) — 0 missing, 0 null, 0 mismatches, 0 type mismatches, 0 extras
- **Figma state:** 794 variables (P:224, S:102, C:451, D:7, L:10), 20 Text Styles, 6 Effect Styles
- **Key actions completed this session:**
  - Parity script: `duration` type correctly included (was in CSS_ONLY_TYPES — fixed)
  - Semantic typography decision: deleted 63 `text/*` Variables from Figma (architectural orphans)
  - Border semantic rename: `border-semantic` → `border` root key; all 20+ component refs updated
  - Density duplication: deleted static `table.density` block from data.json; density/spacing.json is authoritative
  - Color chain: 5 table/input tokens rerouted to semantic aliases
  - Shadow tokens: 16 component tokens marked `$figmaExclude: true`; corresponding Figma vars deleted
  - 24 value mismatches fixed in Figma (border width renames, color chain, 5 design decisions)
  - 2 null aliases: `input/font/family` fixed; `button/font/tracking` deleted (type mismatch, CSS-only)
  - 45 missing component tokens pushed (card, modal, divider, accordion, tabs — restructured names)
  - 32 naming-drift extras deleted from Figma
  - Scope assignment re-run on all 794 variables (115 updated)
- **CRC findings written to:**
  `/Users/nicolasbotero/Library/CloudStorage/OneDrive-TheKsquareGroup/CRC_DS_Group/findings/phase-01-poc-01-token-pipeline-notes.md`
- **Handoff prompt updated:** `tmp/handoff-prompt.md`

---

## 2026-06-04 — Source JSON cleanup (Phase A)

### F22 — Three-way density overlap resolved

- **Date:** 2026-06-04
- **Problem:** Table density tokens existed in three incompatible structures:
  1. `density/spacing.json` — multi-mode `$modes` (Figma Variable modes)
  2. `components/data.json` — static nested density block (three separate `$value` tokens)
  3. `semantic/spacing.json` — single-value aliases (`density.compact → {space.4}`)
- **Resolution:**
  - `density/spacing.json` ($modes) = Figma-facing source — keep. This is the multi-mode Variable mechanism.
  - `components/data.json` `table.density` block = **deleted**. It duplicated density/spacing.json with a different structure.
  - `semantic/spacing.json` density group = **kept as-is**. These are fixed reference values for non-density-aware contexts (always compact, always comfortable) — conceptually different from the multi-mode Variables.
- **Rule going forward:** Components that are density-sensitive reference `{density.*}` tokens. Components that always use a fixed density level reference `{space.density.compact}` etc. from semantic/spacing.json.

### F21 — Purple, cyan, indigo sparse scales — intentional

- **Date:** 2026-06-04
- **State:** `color/purple`: 500+600 only. `color/cyan`: 500 only. `color/indigo`: 500 only.
- **Current usage covers all stops:** chart uses `.500` for all three; navigation.link.visited uses `purple.600`.
- **Risk:** If chart series ever need hover/active/dark states, these scales won't support it without retroactive additions.
- **Decision:** Intentional for current scope. Add full 100–900 scales if chart interactivity is added in Phase 2.

### F20 — Motion file split — intentional, future refactor candidate

- **Date:** 2026-06-04
- **Current state:** `primitives/motion.json` (FLOAT duration vars, Figma-safe) + `primitives/motion-easing.json` (cubicBezier/transition composites, CSS-only).
- **Rationale for split:** Figma cannot store easing curves as Variables. Separating the files allows file-level exclusion in the parity script (`CSS_ONLY_FILES`) rather than token-level exclusion.
- **Cleaner long-term:** Merge into one `motion.json` with `$figmaExclude: true` on each easing/transition token. The parity script already handles token-level `$figmaExclude`; file-level exclusion would no longer be needed.
- **Track for Phase 2 refactor** — not blocking.

### F19 — `color.bg.overlay` rgba string — intentional CSS-only, acceptable for POC

- **Date:** 2026-06-04
- **State:** `color.bg.overlay: "rgba(0,0,0,0.5)"` — `$type: "string"`, already has `$description: "CSS-only — no Figma Color Variable equivalent for rgba"`.
- **Inconsistency noted:** Shadow primitives use alpha-encoded hex for opacity; overlay uses an rgba string. Architecturally, an opacity + color composite would be cleaner.
- **Decision:** Acceptable for POC. If theming support for overlays is needed, refactor to `{ color: "{color.black}", opacity: "{opacity.50}" }` composite approach in Phase 2.

---

## 2026-06-04 — Pipeline architecture: bidirectional sync, structure dictionary, typography decision

### F18 — Core architectural decision: bidirectional sync within a constrained surface area

- **Date:** 2026-06-04
- **Decision:** The token pipeline is **bidirectional within the Figma-eligible surface area**. Code (DTCG JSON) is the authoritative source of truth. Figma is a synced partial mirror — it receives everything it *can* represent and nothing it can't.
- **Sync is script-triggered, not automatic.** No webhook or CI realtime sync exists yet. Both directions are scriptable on demand; "bidirectional" means the mechanisms exist in both directions, not that they run continuously.

#### The two sync directions

| Direction | Script | Status |
|---|---|---|
| JSON → Figma | `scripts/dtcg-to-figma-tokens.mjs` + `use_figma` apply | ✅ Working — confirmed Jun 4 |
| Figma → JSON | `transforms/figma-to-dtcg.ts` + `use_figma` extract | ⚠️ Partial — extractor works, converter needs validation |

#### The structure dictionary

The **eligible surface area** — which tokens can sync in both directions — is defined by a set of exclusion rules in the pipeline. This is the "structure dictionary": a machine-readable contract that specifies what Figma should and should not contain.

| Rule | Location | Meaning |
|---|---|---|
| `CSS_ONLY_FILES` | `parity-check.mjs` | Entire file is CSS-only — not pushed to Figma |
| `CSS_ONLY_TYPES` | `parity-check.mjs` | Token type has no Figma Variable equivalent |
| `$figmaExclude: true` | source DTCG JSON | Individual token is CSS-only |

#### The four categories of intentional exclusion

These token groups exist in source JSON but are NEVER pushed to Figma Variables. They are not defects — they are architectural boundaries.

| Category | Source file | Why excluded | Figma representation instead |
|---|---|---|---|
| Shadow composites | `primitives/shadow.json` | Figma uses Effect Styles, not Variables | Effect Styles (manual binding) |
| Font families (full stacks) | `primitives/typography.json` | Figma stores bare font name only | Figma Variable: bare name; CSS: `expand-font-stacks.mjs` |
| Easing curves + transitions | `primitives/motion-easing.json` | No Figma Variable type for cubicBezier/transition | No Figma equivalent — code-only |
| Semantic text scale | `semantic/typography.json` | Figma uses Text Styles, not Variables | Text Styles (bound to Primitives) |
| Letter-spacing (em strings) | `font/tracking/*` in typography.json | Figma stores % not em — unit mismatch | Figma Variable: raw % value; CSS converts to em |

#### What bidirectionality means in practice

- If a token IS in the eligible surface: change it in JSON → push script updates Figma. Change it in Figma → extract script + `figma-to-dtcg.ts` updates JSON.
- If a token is CSS-only (excluded): JSON is the only source of truth. Figma never touches it. No roundtrip path exists or is needed.
- **Parity is always measured against eligible tokens only** — never against the full token count. The parity script's exclusion rules define what "100%" means.

#### No Figma Desktop required

Both directions work via OAuth (cloud MCP, server `plugin-figma-figma`). No plugin or Figma Desktop needed. This was validated Jun 4 with scopes, text style bindings, and variable extraction all working headlessly.

#### Consequence for semantic typography variables

The 63 `text/*` variables currently in the Figma Semantic collection are **architectural orphans** — they were created before the Text Style decision was finalized. They are not in the eligible surface (their source file `semantic/typography.json` is in `CSS_ONLY_FILES`). They are not in the binding chain (Text Styles bind directly to Primitives, not to these Semantic variables). **Decision: delete from Figma.** Keeping them would force the parity script to grow an exception list and would create a misleading double representation for designers.

- **Action pending:** Delete 63 `text/*` Variables from Figma Semantic collection via `use_figma`.
- **Expected parity after delete:** Extra in Figma drops from 95 → ~32 (naming-drift only).

---

## 2026-06-04 — Scopes, fontStyle binding, and roundtrip strategy

### F13 — Variable scopes set on all variables (naming-convention pass)

- **Date:** 2026-06-04
- **Action:** Set `variable.scopes` on all 864 local variables using a `getLocalVariablesAsync()` bulk read
  (1 API call vs. 864 individual calls — ~50× faster).
- **Result:** 667 updated, 197 already correct, 0 errors.
- **Scope mapping (by naming convention):**

| Variable name pattern | Type | Scope(s) assigned |
|---|---|---|
| `*/shadow/*` | COLOR | `EFFECT_COLOR` |
| `*/text/*`, `*/label/*`, `*/icon/*` | COLOR | `TEXT_FILL` |
| `*/bg/*`, `*/background/*`, `*/surface/*` | COLOR | `FRAME_FILL`, `SHAPE_FILL` |
| `*border*`, `*outline*`, `*stroke*`, `*ring*` | COLOR | `STROKE_COLOR` |
| `*focus*` | COLOR | `STROKE_COLOR` |
| `*overlay*`, `*chart*`, `*feedback*` | COLOR | `SHAPE_FILL` |
| `*interactive*` | COLOR | `FRAME_FILL`, `SHAPE_FILL` |
| Primitive palette (`color/blue/500`, etc.) | COLOR | `ALL_FILLS` |
| `font/size/*`, `*/font/size` | FLOAT | `FONT_SIZE` |
| `font/weight/*`, `*/font/weight` | FLOAT | `FONT_WEIGHT` |
| `font/leading/*`, `*/leading` | FLOAT | `LINE_HEIGHT` |
| `font/tracking/*`, `*/tracking` | FLOAT | `LETTER_SPACING` |
| `*/opacity`, `opacity/*` | FLOAT | `OPACITY` |
| `*/radius`, `radius/*` | FLOAT | `CORNER_RADIUS` |
| `*(border\|stroke\|outline)*width*` | FLOAT | `STROKE_FLOAT` |
| `*/padding/*`, `*/gap/*`, `space/*`, `density/*` | FLOAT | `GAP`, `WIDTH_HEIGHT` |
| `size/*`, `*/height`, `*/width`, `grid/*`, `breakpoint/*` | FLOAT | `WIDTH_HEIGHT` |
| `font/family/*` | STRING | `FONT_FAMILY` |
| All others | ANY | `ALL_SCOPES` |

- **Script:** Inline `use_figma` — uses `getLocalVariablesAsync()` for O(1) fetch, synchronous scope assignment.
- **Implementation note:** Script runs on any file; no dependency on collection structure.

### F14 — fontStyle variable binding: FONT_STYLE scope confirmed working

- **Date:** 2026-06-04
- **Discovery:** `FONT_STYLE` is a valid Figma variable scope (confirmed by successful `v.scopes = ['FONT_STYLE']` assignment).
  `style.setBoundVariable('fontStyle', stringVar)` works on `TextStyle` objects and correctly appears in `style.boundVariables`.
- **Action:** Created 3 STRING variables in Primitives collection with `FONT_STYLE` scope:
  - `font/style/regular` = `"Regular"`
  - `font/style/semibold` = `"Semi Bold"` (note the space — Inter naming convention)
  - `font/style/bold` = `"Bold"`
- **Binding:** All 20 text styles now have `fontStyle` bound — pattern:
  - `text/heading/1-3` → `font/style/bold`
  - `text/heading/4-6`, `text/label/*` → `font/style/semibold`
  - `text/body/*`, `text/caption/*`, `text/code/*` → `font/style/regular`
- **Source JSON updated:** `tokens/primitives/typography.json` — `font.style.*` group added.
- **Final text style binding state:**

| Property | Bound? | Variable |
|---|---|---|
| `fontFamily` | ✅ | `font/family/sans` or `font/family/mono` |
| `fontStyle` | ✅ NEW | `font/style/bold\|semibold\|regular` |
| `fontSize` | ✅ | `font/size/N` |
| `letterSpacing` | ✅ | `font/tracking/normal` (0%) |
| `lineHeight` | ❌ hardcoded | API limitation (see below) |

### F15 — lineHeight: two roundtrip strategies evaluated

- **Date:** 2026-06-04
- **Problem:** `setBoundVariable('lineHeight', floatVar)` forces unit to `PIXELS`, breaking percentage
  line heights (e.g., 120 stored as FLOAT = 120px on a 16px font → 7.5× line spacing).

#### Strategy A — Absolute pixel values (code → Figma direction)
- Store per-text-style lineHeight as `fontSize × ratio` pixels (e.g., heading/1: 40 × 1.2 = 48px).
- Binding works because PIXELS is the stored unit.
- Extraction roundtrip: `px ÷ boundFontSize = ratio` — requires knowing fontSize at export time.
- **Trade-off:** Loses the shared `font/leading/*` primitive abstraction; each text style needs its
  own unique lineHeight variable (20 variables instead of 10 leading steps).
- **Verdict: rejected** — too many variables, breaks the primitive reuse pattern.

#### Strategy B — Hardcoded PERCENT (current, chosen)
- Text styles set `lineHeight = { unit: 'PERCENT', value: N }` at creation time, not via variable binding.
- `font/leading/*` variables exist in Primitives for CSS generation only (not text style binding).
- Extraction roundtrip: read `style.lineHeight` directly from the Text Style (not from variables).
- **Parity check rule:** compare `style.lineHeight.value` (from Figma text styles, not variables) against
  `font.leading.N` value in source JSON. Match is semantic (same number), not structural (not a variable binding).
- **CSS generation:** `lineHeight = font.leading.N / 100` (ratio).
- **Verdict: chosen** — stable, correct, no extra variables, parity check is still verifiable.

### F16 — CSS-only token roundtrip strategy

- **Date:** 2026-06-04
- **Problem:** Several token groups cannot round-trip through Figma (they exist in source JSON but have
  no Figma Variable equivalent). A Figma → code export produces a SUBSET of the full token set.

#### CSS-only groups (present in source JSON, absent from Figma export — by design)

| Group | Source file | Figma representation | Roundtrip path |
|---|---|---|---|
| `shadow.*` | `primitives/shadow.json` | Figma Effect Styles | Read via `getLocalEffectStylesAsync()` |
| `font.family.*` full stacks | `primitives/typography.json` description field | Figma Variable: bare name only | Reconstruct via `expand-font-stacks.mjs` |
| `motion.easing.*`, `motion.transition.*` | `primitives/motion-easing.json` | No Figma equivalent | Source JSON is the only source of truth |
| `semantic/typography.json` (text scales) | `semantic/typography.json` | Figma Text Styles | Read via `getLocalTextStylesAsync()` |

#### Convention
- `$figmaExclude: true` in DTCG JSON marks the above tokens so comparison scripts can skip them.
- When generating CSS, the export must start from **source JSON** (not Figma Variables export) to include
  these CSS-only tokens. The Figma Variables export is a secondary check, not the primary CSS source.

#### Parity comparison rule
When running a Figma → source diff:
1. Skip any source token where `$figmaExclude: true`.
2. Skip `$description` and `$modes` metadata keys.
3. For COLOR tokens: normalize hex to lowercase 6-digit or 8-digit (alpha < 1).
4. For FLOAT tokens that are aliases (`{path.token}`): compare reference paths after normalizing separator (`.` in DTCG, `/` in Figma name → `.`).
5. For multi-mode tokens (`$modes`): the Figma export will have a `valuesByMode` map; source has `$modes`. Both must contain the same mode names and values.
6. Flag as **expected gap** (not a defect): lineHeight in text styles (Figma hardcoded PERCENT vs. source variable reference).

### F17 — Parity check results: 91% (745/815)

- **Date:** 2026-06-04
- **Script:** `scripts/parity-check.mjs` + `tmp/figma-export/generate-figma-vars.mjs`
- **Method:** Efficient extraction using `getLocalVariablesAsync()` + `getLocalVariableCollectionsAsync()` (2 API calls
  instead of 877). Response size limited at 20KB per call → split into 5 parallel collection calls, 2 batches for
  Components (461 vars).

#### Summary

| Category | Count | Explanation |
|---|---|---|
| ✅ Matches | 745 | Core value/alias parity confirmed |
| ❌ Missing in Figma | 46 | Source JSON updated after last Figma push |
| 🟡 Null in Figma | 18 | Broken alias refs (15 shadow + 3 font) |
| 🔴 Value mismatches | 6 | Source updated after push; one `{alias}` vs literal `0` |
| ⚠️ Type mismatches | 0 | Perfect |
| ➕ Extra in Figma | 98 | 57 semantic typography + 3 motion.duration + 38 naming drift |

**Parity score: 91% — excellent for first end-to-end pass.**

#### Category analysis

**Missing in Figma (46)** — source JSON has evolved since the last full push:
- `card/*`: source now uses `card/bg/default`, `card/bg/hover` etc. (Figma has `card/bg`)
- `modal/*`: additional tokens added in source (max-width, header/border-width, body/padding, etc.)
- `divider/*`: 6 new tokens in source not yet pushed
- `accordion/*`: 8 new tokens in source not yet pushed
- `tabs/*`: 4 structural naming changes

**Null values in Figma (18)** — two sub-types:
1. **Expected (15)** — shadow aliases (`{shadow.sm}`, `{shadow.none}`, etc.) resolve to null because
   shadow primitives are `$figmaExclude: true`. The variable exists in Figma as STRING type but value is null.
   This is the correct behavior — shadows are CSS-only and should not be in Figma Variables.
2. **Fixable (3)** — `input/font/family` → `{font.family.sans}` is null. The `font/family/sans` variable
   now exists in Primitives, but the alias wasn't resolved when Components were originally pushed.
   Also `button/font/tracking` → `{font.tracking.normal}` is null (pushed as STRING type but alias not resolved).

**Value mismatches (6)** — Source evolved after push:
- `label/margin-bottom`: source `{space.6}`, Figma `{space.4}` (source value updated)
- `card/footer/bg`: source `{color.neutral.50}`, Figma `{color.bg.secondary}` (semantic vs primitive alias)
- `modal/border-radius`: source `{radius.8}`, Figma `{radius.12}` (source value updated)
- `accordion/border/color`: source `{color.border.light}`, Figma `{color.border.default}` (source updated)
- `accordion/icon/size`: source `{size.icon.md}`, Figma `{size.icon.sm}` (source updated)
- `tabs/gap`: source `{space.0}` alias, Figma literal `0` — **semantically equivalent**, comparison artifact

**Extra in Figma (98)** — three sub-types:
1. **Expected (57)**: `text/heading/*`, `text/body/*`, `text/label/*`, `text/caption/*`, `text/code/*` in Semantic
   collection. These exist in Figma Variables AND as Text Styles. Excluded from comparison because
   `semantic/typography.json` is in the CSS_ONLY_FILES list (the file drives Text Styles, not the comparison).
2. **Expected (3)**: `motion/duration/fast/base/slow` in Primitives. Excluded because the whole
   `primitives/motion-easing.json` file is CSS_ONLY_FILES. The FLOAT duration values ARE valid Figma variables
   (only the easing/transition strings in the same file are CSS-only). Fix: refine the comparison script to
   exclude by type, not by file.
3. **Naming drift (38)**: Component variables in Figma that use OLD naming not matching current source.
   E.g., `modal/close/size` in Figma vs `modal/close-button/size` in source;
   `card/header/font-weight` in Figma vs nested structure in source. These represent source-Figma
   naming divergence from incremental source refactoring without a full re-push.

#### Actions required for 100% parity

| Priority | Action | Scope |
|---|---|---|
| High | Push 46 missing tokens | card, modal, divider, accordion, tabs |
| High | Fix 2 broken font aliases in Figma | `input/font/family`, `button/font/tracking` |
| Medium | Fix 5 value mismatches | label, card, modal, accordion, tabs |
| Medium | Rename 38 drift variables | modal/close, card/*, etc. |
| Low | Remove or reconcile 57 semantic typography extras | Decide: keep as Variables, or delete? |
| Low | Refine parity script to exclude by `$type` within motion-easing.json | Script fix |

---

## 2026-06-03 — Full token push to Figma (850 variables)

### F10 — Complete three-layer token push — 850 variables, 0 errors

- **Date:** 2026-06-03
- **Action:** Deleted all 11 existing variable collections (Global Colors, Sizing, Layout,
  Breakpoints, Font, and all POC-0x collections) and pushed the complete DTCG token set.
- **Pipeline used:** `scripts/dtcg-to-figma-tokens.mjs` (new script) → custom `use_figma`
  apply script with cross-collection `globalByName` alias lookup (key fix to standard
  `apply-tokens.js` which only indexes within the current collection).
- **Result:**

  | Collection   | Mode    | Variables | Errors |
  |--------------|---------|-----------|--------|
  | Primitives   | Value   | 224       | 0      |
  | Semantic     | Light   | 165       | 0      |
  | Components   | Default | 461       | 0      |
  | **Total**    |         | **850**   | **0**  |

- **Alias chains verified working:**
  - Components → Semantic: `button/primary/bg/default` → `color/interactive/primary/default`
  - Semantic → Primitives: `color/interactive/primary/default` → `color/blue/500`
  - Focus/disabled cross-refs within Semantic: `button/focus/outline-color` → `focus/outline/color`
- **Key fix required:** `color.transparent` was initially pushed as `STRING` (correct for CSS,
  wrong for Figma COLOR alias targets). Deleted and recreated as `COLOR` `#00000000` (fully
  transparent black) before pushing Semantic. Source JSON updated accordingly.
- **CSS-only tokens not pushed to Figma (by design):**
  - `motion-easing.json` (cubicBezier, transition composites)
  - `color.bg.overlay` / `color.bg.overlay-light` (rgba() strings → remain as STRING vars)
  - `disabled.cursor = "not-allowed"` (STRING var, pushed but Figma has no cursor concept)
- **Skipped collections (needs redesign for multi-mode):**
  - `layout/breakpoints.json` — mode values are nested sub-keys, not `$extensions.modes`
  - `density/spacing.json` — same issue; multi-mode structure not DTCG-compliant
  - Both will need token file restructure before next push attempt
- **New project script:** `scripts/dtcg-to-figma-tokens.mjs` — DTCG walker that converts
  any set of DTCG JSON files to figma-import-tokens TOKENS array format. Handles all types,
  skips unsupported (cubicBezier, transition), auto-demotes rgba/transparent COLOR → STRING.

---

## 2026-06-03 — Script migration: figma-to-dtcg.ts + config.ts

### F7 — `figma-to-dtcg.ts` and `config.ts` are primary POC outputs — migrated to CRC
- **Discovery:** `CLAUDE.md` calls out `transforms/figma-to-dtcg.ts` and `config.ts` as the
  "primary reusable outputs of the POC" that must be preserved in the CRC documentation project.
  They were not yet copied — discovered when reviewing whether to migrate scripts.
- **What each does:**
  - `figma-to-dtcg.ts` — TypeScript module, Step 1 of Figma→Code pipeline. Converts
    `raw-figma-output.json` (from `figma_get_library_variables`) into per-collection DTCG JSON.
    Handles: RGBA → hex, alias IDs → `{dot.path}` references, collection/type filtering.
    It's an `export function`, not a standalone CLI — imported by `config.ts`.
  - `config.ts` (saved as `config-style-dictionary.ts`) — Style Dictionary v5 config, Step 2.
    Calls `figmaToDTCG()` then `buildAllPlatforms()`. Includes custom `css/tailwind-theme`
    format for `@theme {}` Tailwind v4 output.
- **Copied to:**
  - `CRC_DS_Group/scripts/project/figma-to-dtcg.ts`
  - `CRC_DS_Group/scripts/project/config-style-dictionary.ts`
- **Files updated:** `wiki/project/custom-scripts-inventory.md`, `wiki/meta/architecture.md`
- **CRC Phase 2 note:** The `primitiveColorFamilies` filter in `config-style-dictionary.ts`
  is POC-specific. Replace with `t.path[0] !== 'primitive'` once the three-layer structure is live.

---

## 2026-06-03 — Code→Figma push + motion file split

### F1 — Figma MCP server name is `plugin-figma-figma` (not `figma`)
- **Discovery:** Calling `use_figma` with server name `"figma"` returns "MCP server does not exist."
  The correct server identifier is `"plugin-figma-figma"`.
- **Impact:** Every `CallMcpTool` for Figma must use `server: "plugin-figma-figma"`.
- **No file change needed** — session note only.

### F2 — Figma MCP works without Desktop app or Bridge plugin
- **Discovery:** `use_figma` calls succeed via OAuth (cloud) — Figma Desktop and the Desktop Bridge
  plugin are not required. The CLAUDE.md note about "Bridge active — waiting for connections" is
  outdated for the `use_figma` skill path.
- **Impact:** Can run Code→Figma pushes in any session without opening Figma Desktop.
- **Action needed:** Update `CLAUDE.md` to remove the Desktop Bridge prerequisite for `use_figma` calls.

### F3 — motion.json split: durations (Figma path) vs. easing (CSS-only path)
- **Discovery:** `parse-tokens.mjs` (from `figma-import-tokens` skill) maps DTCG `cubicBezier` arrays
  and `transition` composite objects to Figma `STRING` type, which `apply-tokens.js` then stringifies
  to `"0.2,0,0,1"` or `"[object Object]"` — corrupt variable values in Figma.
- **Root cause:** Figma Variables only support COLOR, FLOAT, STRING, BOOLEAN. There is no native type
  for cubic-bezier arrays or transition composites. The skill doesn't guard against this.
- **Fix applied:** Split `tokens/primitives/motion.json` into two files:
  - `tokens/primitives/motion.json` — durations only (`$type: duration`, FLOAT-safe for Figma)
  - `tokens/primitives/motion-easing.json` — cubicBezier + transition (DTCG-only, CSS path)
- **Architecture rule:** Any DTCG type other than `color`, `dimension`, `number`, `string`, `boolean`
  must NOT be passed through `parse-tokens.mjs` → `apply-tokens.js`. Keep it CSS-only.
- **Files changed:** `tokens/primitives/motion.json`, `tokens/primitives/motion-easing.json` (new)

### F4 — `dtcg-convert.mjs` needs `--resolve-from` for cross-file alias resolution
- **Discovery:** After splitting `motion.json`, the transition composite tokens in `motion-easing.json`
  reference `{motion.duration.base}` — which is now in a separate file. Without cross-file resolution,
  the alias falls back to `0ms` instead of `250ms`.
- **Fix applied:** Added `--resolve-from <file>` flag to `dtcg-convert.mjs`. Files passed via
  `--resolve-from` are loaded into the alias token map but are NOT emitted in the output — so duration
  tokens don't duplicate into the easing CSS block.
- **Command:** `node scripts/dtcg-convert.mjs tokens/primitives/motion-easing.json --resolve-from tokens/primitives/motion.json --format tailwind-v4`
- **Output:** `--motion-transition-standard: 250ms 0ms cubic-bezier(0.2, 0, 0, 1)` ✅ (no warnings)
- **Files changed:** `scripts/dtcg-convert.mjs`, `scripts/project/dtcg-convert.mjs` (CRC copy synced)

### F5 — Code→Figma push confirmed for COLOR + FLOAT types
- **Discovery:** `figma-import-tokens` skill (`parse-tokens.mjs` + `apply-tokens.js`) correctly pushes:
  - `color/primitive/red/500` → Figma COLOR variable `{r: 0.8, g: 0, b: 0, a: 1}` ✅
  - `motion/duration/fast/base/slow` → Figma FLOAT variables `150 / 250 / 350` ✅
- **Test:** Created `POC-01/Primitives` collection in Figma file `aJR7eNwefjbUwcSEZr9tqK`,
  `Light` mode. 4 tokens created, 0 errors. Values verified by read-back.
- **Confirmed pipeline:** DTCG JSON → `parse-tokens.mjs` → `apply-tokens.js` (via `use_figma`) → Figma Variables
- **Confirmed boundary:** cubicBezier and transition types MUST NOT go through this pipeline.
- **Files changed:** `wiki/project/token-architecture.md` (§3 + §8 rows updated)

### F6 — Figma file already has a `Motion` collection from prior session
- **Discovery:** Inspecting `aJR7eNwefjbUwcSEZr9tqK` revealed a `Motion` collection (3 vars,
  `Value` mode) with `motion/duration/fast/base/slow` already pushed — values match exactly.
  Also `POC-02/Primitives`, `POC-02/Semantic`, `POC-02/Component` collections from a prior POC.
- **Impact:** The next POC naming should follow the `POC-NN/` prefix convention established by POC-02.
- **No file change** — session note for architectural awareness.

### F7 — figma-to-dtcg.ts + config.ts migrated to CRC project

- **Discovery:** Both `transforms/figma-to-dtcg.ts` and `config.ts` are reusable beyond the POC.
- **Action:** Copied to `/CRC_DS_Group/scripts/project/figma-to-dtcg.ts` and `config-style-dictionary.ts`.
- **Files changed:** `wiki/project/custom-scripts-inventory.md` (entries added)

### F8 — Full three-layer token JSON set created with proper DTCG aliasing

- **Date:** 2026-06-03
- **Problem:** `tmp/token-list-crc.md` described the token system but had no DTCG `{path.to.token}` alias
  chains — just prose descriptions (`color-text-primary: neutral-900`). Any Figma push would create
  flat, disconnected collections with no aliasing and no theme-swap capability.
- **Solution:** Created the complete three-layer token file set (20 files) with full aliasing chains:
  - **Layer 1 — Primitives:** raw values only
  - **Layer 2 — Semantic:** 100% `{color.X.Y}` aliases to primitives — no hardcoded hex
  - **Layer 3 — Components:** `{color.semantic.X}` aliases to semantic — never skip a layer
- **Unit contract (locked):**
  - Spacing / font-size: unitless number → converted to `rem` (÷16) at CSS generation
  - Radius / border-width / sizing: unitless number → stays `px` in CSS output
  - Font-weight / line-height / opacity / z-index: unitless number (ratio or integer)
  - Letter-spacing: em string → `$type: "string"` (CSS-only, no Figma float)
  - Font families: full stack string → `$type: "fontFamily"` (Figma STRING = primary font only)
  - Colors: hex string → `$type: "color"` (Figma COLOR)
  - Motion durations: unitless ms number → `$type: "number"` (Figma FLOAT)
- **Files created:**
  - `tokens/primitives/`: color.json, spacing.json, typography.json, radius.json, border.json,
    opacity.json, sizing.json (updates motion.json already existed)
  - `tokens/semantic/`: color.json, spacing.json, focus.json, motion.json
  - `tokens/components/`: button.json, input.json, forms.json, feedback.json, layout.json,
    navigation.json, data.json, overlays.json
  - `tokens/layout/`: breakpoints.json
  - `tokens/density/`: spacing.json
- **Critical architecture rule enforced:**
  The only correct theming pattern: swap semantic layer → components inherit automatically.
  Any component token that bypasses semantic and aliases directly to a primitive becomes
  non-themeable. This is now enforced structurally — components only reference `{color.*}`
  semantic paths, never `{color.blue.500}` or other primitive paths directly.
- **Example aliasing chain (end-to-end):**
  ```
  button.primary.bg.default
    → {color.interactive.primary.default}   [semantic/color.json]
      → {color.blue.500}                    [primitives/color.json]
        → "#1E5AFF"                         [raw value]
  ```
  Swapping theme: change `color.interactive.primary.default` → `{color.teal.500}` in Figma
  Semantic mode. All buttons update. Zero component file changes needed.

### F9 — Token audit: 4 structural gaps found and fixed

- **Date:** 2026-06-03
- **Audit scope:** All 23 token files created in F8 cross-checked against `tmp/token-list-crc.md`
- **Issue 1 — Missing `primitives/shadow.json`:** 14 hardcoded `rgba()` shadow strings were
  inlined across 7 component files. Created `shadow.none/xs/sm/md/lg/xl/2xl`. All component
  shadow fields now alias `{shadow.sm}`, `{shadow.lg}`, etc.
- **Issue 2 — Missing `semantic/typography.json`:** Entire text scale absent. Created full scale:
  heading 1–6, body lg/md/sm/xs, label lg/md/sm/xs, caption lg/md/sm, code lg/md/sm.
  All alias `{font.size.N}`, `{font.weight.X}`, `{font.leading.N}` primitives.
- **Issue 3 — Missing `semantic/border.json`:** No `border-width-default/thick/heavy` semantic
  aliases. Created file with three width aliases. Components were referencing `{border.width.1}`
  primitives directly — acceptable for now but noted.
- **Issue 4 — `{color.white}` in component backgrounds:** 6 input/checkbox/radio/select/pagination
  background fields used `{color.white}` (primitive) instead of `{color.bg.primary}` (semantic).
  In dark mode, this would prevent white→dark background swap. Fixed all 6. Also fixed
  `avatar.border.color` to use `{color.bg.primary}`. Remaining `{color.white}` references are
  all text-on-colored-backgrounds (correct — constant white regardless of theme).
- **Total files after audit:** 26 token files (3 new semantic files + 1 new primitive file)
- **Alias chain fully closed:** No hardcoded rgba() or hex values outside of primitives layer.
  No shadow strings outside of `primitives/shadow.json`.

### F10 — Full Figma push: Primitives + Semantic + Components (3 collections, 850 vars)

*(No change — see prior session summary for details.)*

### F11 — Deferred collections pushed: Density + Layout (multi-mode)

- **Date:** 2026-06-03
- **Problem:** `density/spacing.json` and `layout/breakpoints.json` used a nested sub-key
  pattern for mode variants (`compact`/`comfortable`/`spacious` as path segments) which the
  converter treated as additional token nodes rather than mode slots.
- **Fix — DTCG convention adopted:** Introduced a `$modes` key alongside `$type` on
  multi-mode tokens. The converter's `walk()` function now detects `$modes` and emits a
  single Figma variable with one `values` entry per mode, rather than one variable per mode.
  Tokens with `$value` (single-mode) continue to work as before. No breaking change.
- **Format (locked for multi-mode tokens):**
  ```json
  { "$type": "number", "$modes": { "Comfortable": "{space.12}", "Compact": "{space.8}", "Spacious": "{space.16}" } }
  ```
- **Script updated:** `scripts/dtcg-to-figma-tokens.mjs` — `walk()` extended with `$modes`
  branch, `coerceValue()` helper extracted for shared rgba/alias handling.
- **Density collection pushed:**
  - Modes: `Comfortable` (default) / `Compact` / `Spacious`
  - Variables: 7 (`density/component/padding/x|y`, `density/component/height`,
    `density/component/gap`, `density/table/row-height`, `density/table/cell-padding/x|y`)
  - All 3 density modes per variable; aliased values resolved to Primitives via globalByName
  - 0 errors
- **Layout collection pushed:**
  - Modes: `Desktop` (default) / `Tablet` / `Mobile`
  - Variables: 10 (`breakpoint/xs|sm|md|lg|xl|2xl` — single-value constants;
    `grid/columns|gutter|margin|max-width` — responsive, 3-mode)
  - Breakpoints are intentionally single-mode (they're viewport boundary constants,
    not values that change per viewport)
  - 0 errors
- **Final Figma file state (all 5 collections):**

  | Collection  | Modes                              | Variables |
  |-------------|-------------------------------------|-----------|
  | Primitives  | Value                               | 224       |
  | Semantic    | Light                               | 165       |
  | Components  | Default                             | 461       |
  | Density     | Comfortable / Compact / Spacious    | 7         |
  | Layout      | Desktop / Tablet / Mobile           | 10        |
  | **Total**   |                                     | **867**   |

- **Styles not touched:** Only Figma Variables (`figma.variables.*`) were used in all
  pushes. Text Styles, Color Styles, and Effect Styles were not created, modified, or
  deleted. Shadow tokens are stored as STRING variables in the Primitives collection
  (CSS-only; an Effect Style push would be a separate future step if needed).

### F12 — CSS-only tokens, Figma Style vs Variable, breakpoint fix, scope awareness

- **Date:** 2026-06-03

#### CSS-only tokens (do NOT push to Figma Variables)
The following token groups have no valid Figma Variable equivalent. They carry `$figmaExclude: true`
and are skipped by `dtcg-to-figma-tokens.mjs`. They are only consumed at CSS generation time.

| Token group | Reason |
|---|---|
| `shadow.*` | Box-shadow strings → Figma **Effect Styles**, not Variables |
| `font.family.*` | Full CSS stacks (e.g. `-apple-system, BlinkMacSystemFont...`) → Figma can only use a bare font name. The Figma file's Font variable collection is the source of truth for font bindings |
| `font.tracking.*` | Em strings (e.g. `-0.04em`) → Figma letter-spacing is stored in %, not em. Conversion: Figma% ÷ 100 = em |
| `motion.easing.*` | `cubicBezier` arrays → no Figma Variable type |
| `motion.transition.*` | Composite transition → no Figma Variable type |
| `semantic/typography.json` (text scales) | Heading/body/label scales → Figma **Text Styles**, not Variables. A future `get-styles.js` will create Text Styles from these tokens |

#### Figma Style vs. Variable boundary (confirmed)
- **Variables:** scalar values (color, number, string, boolean) — live in Variables panel
- **Effect Styles:** shadows and blurs — live in Styles panel
- **Text Styles:** bundled font-family + size + weight + line-height + letter-spacing — live in Styles panel
- **Rule:** if a CSS property composes multiple values or is non-scalar, it's a Style, not a Variable

#### Converter updates (dtcg-to-figma-tokens.mjs)
- Checks `$figmaExclude: true` on both `$value` and `$modes` nodes and skips them
- Also skips `$type: "fontFamily"` unconditionally (full stacks can never be valid Figma font names)
- `cubicBezier` and `transition` were already skipped; now also documented via `$figmaExclude`

#### Breakpoints zero-value bug (fixed)
- **Root cause:** When a token in a multi-mode collection only has a value for one mode, Figma fills
  the other modes with `0` for FLOAT variables. Breakpoints only had `Desktop` values.
- **Fix:** Changed breakpoint tokens from `$value` (single) to `$modes` with explicit values for
  all three modes. Breakpoints are viewport boundary constants — the same value in every mode is
  correct by design (they're the threshold boundaries, not values that respond to the active breakpoint).
- **Affected tokens:** `breakpoint/xs|sm|md|lg|xl|2xl` and `grid/max-width` — all corrected to
  repeat their Desktop value across Tablet and Mobile.

#### Text style property map — what IS and IS NOT a Figma Variable

Analyzed all properties a Figma text style exposes (Basic + Details panels):

| Property | Figma Variable? | Type/Scope | Note |
|---|---|---|---|
| Font family | ✅ STRING / FONT_FAMILY | `font/family/*` in Primitives | Primary font name only |
| Font size | ✅ FLOAT / FONT_SIZE | `font/size/*` in Primitives | px value |
| Font weight | ✅ FLOAT / FONT_WEIGHT | `font/weight/*` in Primitives | 400, 600, 700... |
| Line height | ✅ FLOAT / LINE_HEIGHT | `font/leading/*` in Primitives | ratio (1.5 = 150%) |
| Letter spacing | ✅ FLOAT / LETTER_SPACING | `font/tracking/*` in Primitives | **Figma % not em** |
| Decoration (underline/strike) | ❌ CSS-only | — | `text-decoration` |
| Text case | ❌ CSS-only | — | `text-transform` |
| Paragraph spacing | ❌ CSS-only | — | `margin-bottom` on `<p>` |
| List spacing | ❌ CSS-only | — | `margin` on `<li>` |
| Paragraph indent | ❌ CSS-only | — | `text-indent` |
| Vertical trim | ❌ CSS-only | — | `leading-trim` / `text-box` |
| OpenType features | ❌ CSS-only | — | `font-feature-settings` |
| Kerning pairs | ❌ CSS-only | — | `font-kerning: auto` |

**font/tracking unit conversion (locked):**
`Figma% ÷ 100 = em value in CSS`
(e.g. Figma `2.5%` = `0.025em`, Figma `-4%` = `-0.04em`)

#### Styles applied to Figma (final state)
- **Deleted:** 37 legacy Text Styles + 19 legacy Effect Styles + 217 legacy Paint/Color Styles (all from source library)
- **Created — Effect Styles (6):** `shadow/xs|sm|md|lg|xl|2xl` — multi-layer DROP_SHADOW effects parsed directly from the CSS box-shadow values in `primitives/shadow.json`
- **Created — Text Styles (20):** `text/heading/1-6`, `text/body/lg-xs`, `text/label/lg-xs`, `text/caption/lg-sm`, `text/code/lg-sm` — all resolved from `semantic/typography.json`
  - Font family: Inter (sans), Roboto Mono (code variants) — **note: update to project font once decided**
  - Line-height: stored as PERCENT (leading ratio × 100), e.g. 1.5 → 150%
- **shadow/none** intentionally omitted from Effect Styles — a "no shadow" style adds no value

#### Text style variable bindings (applied)
Bound 3 of 5 bindable font properties on all 20 text styles:

| Property | Bound? | Variable | Reason |
|---|---|---|---|
| `fontSize` | ✅ | `font/size/N` | Works cleanly |
| `fontFamily` | ✅ | `font/family/sans` or `font/family/mono` | Works cleanly |
| `letterSpacing` | ✅ | `font/tracking/normal` (0%) | Works cleanly |
| `lineHeight` | ❌ hardcoded | — | **Figma API limitation:** binding a FLOAT variable to `lineHeight` forces `PIXELS` unit, overriding the `PERCENT` unit we set at creation. 120 as PIXELS on a 40px font = 3× line spacing (broken). Hardcoded PERCENT is correct and stable. |
| `fontStyle` | ❌ not bound | — | fontStyle ("Bold", "Semi Bold") requires a STRING variable. We only have FLOAT `font/weight/*`. Could add STRING weight-name variables in a future pass. |

#### Effect style shadow color binding — Plugin API gap
`EffectStyle.setBoundVariable()` does not exist in the Figma Plugin API. `EffectStyle` only has a read-only `boundVariables` property. The `setBoundVariableForEffect()` method exists only on `SceneNode` objects (individual canvas nodes), not on style objects.

**Workaround:** Shadow color variables (`color/shadow/5`, `color/shadow/10`, `color/shadow/25`) exist in Primitives as COLOR variables. A designer can manually bind them in the Figma UI by clicking the variable binding icon next to each shadow layer color. This is a one-time, per-style operation.

**Primitives added for this purpose:**
- `color/black` = `#000000`
- `color/shadow/5` = `#0000000D` (rgba(0,0,0,0.05))
- `color/shadow/10` = `#0000001A` (rgba(0,0,0,0.10))
- `color/shadow/25` = `#00000040` (rgba(0,0,0,0.25))

#### font/leading unit decision (locked)
Stored as percent integer (120 = 120%) not ratio (1.2). Figma reads it as percent natively. CSS generation divides by 100: `120 → line-height: 1.2`. The key name already encodes the percent, so the naming is self-consistent (`font/leading/120` = value `120`).

#### Final file state after all cleanup
| Entity | Count |
|---|---|
| Variables — Primitives | 234 (was 224 — added font/family × 4, font/tracking × 6) |
| Variables — Semantic | 165 |
| Variables — Components | 461 |
| Variables — Density | 7 |
| Variables — Layout | 10 |
| **Total Variables** | **877** |
| Text Styles | 20 |
| Effect Styles | 6 |
| Paint/Color Styles | 0 (all deleted — superseded by Color Variables) |

#### Variable scopes (deferred, not implemented yet)
- All variables currently default to `ALL_SCOPES` — they appear in every Figma property picker.
- This is the correct next cleanup pass. Mapping per variable type:
  - Color variables → `FRAME_FILL / SHAPE_FILL / TEXT_FILL / STROKE_COLOR` (split by usage)
  - Spacing/sizing → `GAP / WIDTH_HEIGHT`
  - Font-size → `FONT_SIZE`
  - Font-weight → `FONT_WEIGHT` (Figma 2024+)
  - Opacity → `OPACITY`
  - Radius → `CORNER_RADIUS`
  - Density/Layout FLOAT vars → context-specific
- **Recommendation:** Do this as a post-push pass using a `use_figma` script that reads the
  collection and applies scopes by naming convention.

#### Cleanup: unused files deleted
- `tokens/dtcg/` (early prototype output)
- `tokens/font-variables.json` (old Figma export snapshot — 2 Font vars)
- `tokens/motion-variables.json` (old Figma export snapshot — 3 Motion vars)
- `tokens/test-push.json` (scratch test file)
- `tokens/raw/` kept as historical reference

---

## How to use this file
- Read this before starting a new session to restore context fast.
- After any discovery or constraint, add an entry here immediately.
- When the CRC findings file is updated, cross-reference the entry number (e.g. "→ F4").
- Entries are never deleted — mark superseded entries with `~~strikethrough~~` + a note.

// get-styles.js — capture boundVariables + resolved values for all local styles.
// Run via Figma MCP in your editor (Plugin API context).
// Returns: textStyles, effectStyles, paintStyles — each with resolved variable names
// and per-property/per-effect boundVariables.

// --- Variable lookup (local + library via getVariableByIdAsync fallback) ---
const varNameMap = {};
try {
  const allVars = await figma.variables.getLocalVariablesAsync();
  for (const v of allVars) varNameMap[v.id] = v.name;
} catch (e) {}

async function resolveVarId(id) {
  if (varNameMap[id]) return varNameMap[id];
  try {
    const v = await figma.variables.getVariableByIdAsync(id);
    if (v) { varNameMap[id] = v.name; return v.name; }
  } catch (e) {}
  return id;
}

async function resolveBoundVar(bv) {
  if (!bv) return null;
  if (Array.isArray(bv)) {
    const out = [];
    for (const x of bv) out.push(x && x.id ? await resolveVarId(x.id) : x);
    return out;
  }
  if (bv.id) return await resolveVarId(bv.id);
  return bv;
}

async function normalizeBV(bvObj) {
  if (!bvObj) return {};
  const out = {};
  for (const key of Object.keys(bvObj)) out[key] = await resolveBoundVar(bvObj[key]);
  return out;
}

function toHex(c) {
  if (!c) return null;
  return '#' + ['r', 'g', 'b'].map(ch => Math.round((c[ch] || 0) * 255).toString(16).padStart(2, '0')).join('');
}

// --- Text styles ---
const rawTextStyles = await figma.getLocalTextStylesAsync();
const textStyles = [];
for (const s of rawTextStyles) {
  const bv = await normalizeBV(s.boundVariables);
  textStyles.push({
    id: s.id,
    name: s.name,
    fontSize: s.fontSize,
    fontFamily: s.fontName ? s.fontName.family : null,
    fontStyle: s.fontName ? s.fontName.style : null,
    lineHeight: s.lineHeight,
    letterSpacing: s.letterSpacing,
    boundVariables: bv,
    hasBoundVars: Object.keys(bv).length > 0
  });
}

// --- Effect styles ---
const rawEffectStyles = await figma.getLocalEffectStylesAsync();
const effectStyles = [];
for (const s of rawEffectStyles) {
  const styleBV = await normalizeBV(s.boundVariables);
  const effects = [];
  for (const e of (s.effects || [])) {
    const ebv = await normalizeBV(e.boundVariables);
    effects.push({
      type: e.type,
      visible: e.visible,
      radius: e.radius,
      color: e.color ? { hex: toHex(e.color), a: Math.round(e.color.a * 100) / 100 } : null,
      offset: e.offset,
      spread: e.spread,
      boundVariables: ebv
    });
  }
  effectStyles.push({
    id: s.id,
    name: s.name,
    effects,
    boundVariables: styleBV,
    hasBoundVars: Object.keys(styleBV).length > 0 || effects.some(e => Object.keys(e.boundVariables).length > 0)
  });
}

// --- Paint styles ---
const rawPaintStyles = await figma.getLocalPaintStylesAsync();
const paintStyles = [];
for (const s of rawPaintStyles) {
  const styleBV = await normalizeBV(s.boundVariables);
  const paints = [];
  for (const p of (s.paints || [])) {
    const pbv = await normalizeBV(p.boundVariables);
    paints.push({
      type: p.type,
      color: toHex(p.color),
      opacity: p.opacity,
      boundVariables: pbv,
      hasBoundVars: Object.keys(pbv).length > 0
    });
  }
  paintStyles.push({
    id: s.id,
    name: s.name,
    paints,
    boundVariables: styleBV,
    hasBoundVars: Object.keys(styleBV).length > 0 || paints.some(p => p.hasBoundVars)
  });
}

return {
  summary: {
    textStyleCount: textStyles.length,
    effectStyleCount: effectStyles.length,
    paintStyleCount: paintStyles.length,
    textWithBoundVars: textStyles.filter(s => s.hasBoundVars).length,
    effectsWithBoundVars: effectStyles.filter(s => s.hasBoundVars).length,
    paintsWithBoundVars: paintStyles.filter(s => s.hasBoundVars).length
  },
  textStyles,
  effectStyles,
  paintStyles
};

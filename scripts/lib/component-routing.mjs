/**
 * Components collection: one JSON file per Figma variable group (first path segment).
 * Prefixes containing * are ignored (Figma internal / deprecated markers).
 */

export function isIgnoredComponentPrefix(prefix) {
  return !prefix || prefix.includes('*');
}

/** @returns {string | null} relative path under tokens/ e.g. components/button.json */
export function routeComponentVariable(name) {
  const prefix = name.split('/')[0];
  if (isIgnoredComponentPrefix(prefix)) return null;
  return `components/${prefix}.json`;
}

/**
 * Collect unique component prefixes from a Figma export object.
 * @param {{ vars: { n: string }[] } | undefined} componentsCol
 * @returns {string[]}
 */
export function discoverComponentPrefixes(componentsCol) {
  if (!componentsCol?.vars?.length) return [];
  const set = new Set();
  for (const v of componentsCol.vars) {
    const prefix = v.n.split('/')[0];
    if (!isIgnoredComponentPrefix(prefix)) set.add(prefix);
  }
  return [...set].sort();
}

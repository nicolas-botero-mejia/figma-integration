import { existsSync, statSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Default Figma Variable collection order, derived from tokens/ scaffold folders.
 * Must match tokens/README.md and figma-export-to-dtcg ROUTES keys.
 */
export const TOKEN_FOLDER_TO_COLLECTION = [
  ['primitives', 'Primitives'],
  ['semantic', 'Semantic'],
  ['components', 'Components'],
  ['density', 'Density'],
  ['layout', 'Layout'],
];

/**
 * Discover Figma collection names from top-level tokens/ directories.
 * @param {string} tokensDir
 * @returns {string[]}
 */
export function discoverCollectionsFromTokens(tokensDir) {
  if (!existsSync(tokensDir)) return [];

  return TOKEN_FOLDER_TO_COLLECTION.filter(([folder]) => {
    const path = join(tokensDir, folder);
    try {
      return statSync(path).isDirectory();
    } catch {
      return false;
    }
  }).map(([, collection]) => collection);
}

/**
 * Map a Figma collection name back to tokens/ folder (if known).
 * @param {string} collection
 * @returns {string | undefined}
 */
export function collectionToTokenFolder(collection) {
  return TOKEN_FOLDER_TO_COLLECTION.find(([, name]) => name === collection)?.[0];
}

/**
 * List token scaffold folders present (for diagnostics).
 * @param {string} tokensDir
 * @returns {string[]}
 */
export function listTokenScaffoldFolders(tokensDir) {
  if (!existsSync(tokensDir)) return [];
  return readdirSync(tokensDir).filter((name) => {
    if (name.startsWith('.')) return false;
    try {
      return statSync(join(tokensDir, name)).isDirectory();
    } catch {
      return false;
    }
  });
}

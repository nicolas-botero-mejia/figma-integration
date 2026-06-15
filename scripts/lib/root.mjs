import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const LIB_DIR = dirname(fileURLToPath(import.meta.url));

/** Project root (figma-integration/) — safe on Windows and macOS. */
export const ROOT = join(LIB_DIR, '../..');

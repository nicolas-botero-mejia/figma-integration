import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const DEFAULTS_PATH = join(ROOT, 'config/figma.defaults.json');
const CONFIG_PATH = join(ROOT, 'config/figma.json');

const PLACEHOLDERS = [
  'YOUR_FIGMA_FILE_KEY',
  'your-design-system',
  'your_figma_file_key',
];

/** @typedef {'ok'|'not_initialized'|'incomplete'|'invalid'} ConfigStatus */

export function readDefaults() {
  if (!existsSync(DEFAULTS_PATH)) {
    throw new Error(`Missing ${DEFAULTS_PATH}`);
  }
  return JSON.parse(readFileSync(DEFAULTS_PATH, 'utf8'));
}

export function readLocalConfig() {
  if (!existsSync(CONFIG_PATH)) return null;
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
  } catch (err) {
    return { __parseError: err.message };
  }
}

export function mergeConfig(defaults, local) {
  return { ...defaults, ...(local ?? {}) };
}

/**
 * @returns {{ status: ConfigStatus, config?: object, reason?: string }}
 */
export function getConfigStatus() {
  const defaults = readDefaults();
  const local = readLocalConfig();

  if (!local) {
    return { status: 'not_initialized', config: defaults };
  }

  if (local.__parseError) {
    return { status: 'invalid', reason: `Invalid JSON: ${local.__parseError}` };
  }

  const config = mergeConfig(defaults, local);
  const values = [config.fileKey, config.fileName, config.url].filter(Boolean).join(' ');
  const hasPlaceholder = PLACEHOLDERS.some((p) => values.includes(p));

  if (hasPlaceholder || !config.fileKey?.trim()) {
    return {
      status: 'not_initialized',
      config,
      reason: 'fileKey and url are not set',
    };
  }

  if (!/^[A-Za-z0-9]{10,64}$/.test(config.fileKey)) {
    return { status: 'invalid', config, reason: `Invalid fileKey: ${config.fileKey}` };
  }

  if (!Array.isArray(config.collections) || config.collections.length === 0) {
    return {
      status: 'incomplete',
      config,
      reason: 'collections is empty — add names from Figma Local variables panel, then npm run init -- --merge --collections …',
    };
  }

  return { status: 'ok', config };
}

export function loadConfig({ required = true, allowIncomplete = false } = {}) {
  const { status, config, reason } = getConfigStatus();

  if (status === 'ok') return config;
  if (status === 'incomplete' && allowIncomplete) return config;

  if (!required) return null;

  fail(status, reason);
}

function fail(status, reason) {
  console.error('\n⚠️  Figma config required\n');

  if (status === 'not_initialized') {
    console.error([
      'This project is not initialized yet.',
      '',
      '  npm run init -- --url "https://www.figma.com/design/…" --collections Primitives Semantic …',
      '',
      'Collection names: Figma → Local variables panel (each tab = one collection).',
      'See docs/setup.md or AGENTS.md',
    ].join('\n'));
  } else if (status === 'incomplete') {
    console.error([
      'config/figma.json is partially configured.',
      reason ?? '',
      '',
      'Add collection names from Figma → Local variables, then:',
      '  npm run init -- --merge --collections CollectionA CollectionB …',
    ].join('\n'));
  } else {
    console.error(reason ?? 'config/figma.json is invalid.');
    console.error('Re-run init or fix the file manually.');
  }

  console.error('');
  process.exit(1);
}

export { CONFIG_PATH, DEFAULTS_PATH, ROOT };

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ROOT } from './root.mjs';

const CANONICAL = join(ROOT, '.mcp.json');

const EDITOR_MCP_PATHS = {
  copilot: [join(ROOT, '.github/mcp.json'), join(ROOT, '.vscode/mcp.json')],
  cursor: [join(ROOT, '.cursor/mcp.json')],
};

/** Sync root .mcp.json into per-editor MCP config files. */
export function wireMcp(editor = 'both') {
  if (!existsSync(CANONICAL)) {
    throw new Error(`Missing canonical MCP config: ${CANONICAL}`);
  }

  const payload = readFileSync(CANONICAL, 'utf8');
  JSON.parse(payload);

  const paths = [];
  if (editor === 'copilot' || editor === 'both') paths.push(...EDITOR_MCP_PATHS.copilot);
  if (editor === 'cursor' || editor === 'both') paths.push(...EDITOR_MCP_PATHS.cursor);

  for (const path of paths) {
    writeFileSync(path, payload, 'utf8');
  }

  return paths;
}

#!/usr/bin/env node
/**
 * Verify MCP config, skills install targets, and project config.
 *
 * Usage: npm run doctor
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { getConfigStatus } from './lib/load-config.mjs';
import { SOUTHLEFT_SKILLS } from './lib/install-skills.mjs';
import { ROOT } from './lib/root.mjs';

const PLUGIN_SKILL_SAMPLE = 'figma-generate-design';

function checkMcp() {
  const paths = ['.mcp.json', '.github/mcp.json', '.cursor/mcp.json'];
  const missing = paths.filter((p) => !existsSync(join(ROOT, p)));
  if (missing.length) {
    return { ok: false, msg: `Missing MCP config: ${missing.join(', ')}` };
  }
  return { ok: true, msg: 'MCP config files present' };
}

function listSkillDirs(base) {
  if (!existsSync(base)) return [];
  return readdirSync(base).filter((name) => {
    if (name.startsWith('.')) return false;
    try {
      return statSync(join(base, name)).isDirectory();
    } catch {
      return false;
    }
  });
}

function checkSkillsDir(rel) {
  const base = join(ROOT, rel);
  if (!existsSync(base)) {
    return { ok: false, msg: `${rel}/ missing — run npm run init:env` };
  }

  const installed = listSkillDirs(base);
  const missingSouthleft = SOUTHLEFT_SKILLS.filter((s) => !installed.includes(s));
  const hasPluginSkill = installed.includes(PLUGIN_SKILL_SAMPLE);

  if (missingSouthleft.length || !hasPluginSkill) {
    const parts = [];
    if (missingSouthleft.length) parts.push(`missing southleft: ${missingSouthleft.join(', ')}`);
    if (!hasPluginSkill) parts.push(`missing plugin skills (e.g. ${PLUGIN_SKILL_SAMPLE})`);
    return { ok: false, msg: `${rel}/ — ${parts.join('; ')} — run npm run init:env` };
  }

  return { ok: true, msg: `${rel}/ — ${installed.length} skills installed` };
}

function main() {
  let failed = false;

  console.log('figma-integration doctor\n');

  const mcp = checkMcp();
  console.log(mcp.ok ? `✅  ${mcp.msg}` : `❌  ${mcp.msg}`);
  if (!mcp.ok) failed = true;

  for (const rel of ['.github/skills', '.cursor/skills']) {
    const skills = checkSkillsDir(rel);
    console.log(skills.ok ? `✅  ${skills.msg}` : `❌  ${skills.msg}`);
    if (!skills.ok) failed = true;
  }

  const { status, reason } = getConfigStatus();
  if (status === 'ok') {
    console.log('✅  config/figma.json — ok');
  } else if (status === 'incomplete') {
    console.log(`⚠️  config/figma.json — incomplete (${reason})`);
  } else {
    console.log(`⭕  config/figma.json — ${status}${reason ? ` (${reason})` : ''}`);
  }

  console.log('\nManual (not checked by doctor):');
  console.log('  • Figma plugin activated in your editor');
  console.log('  • Figma MCP OAuth complete');
  console.log('  • Connection test: scripts/mcp-connection-test.js via use_figma');

  process.exit(failed ? 1 : 0);
}

main();

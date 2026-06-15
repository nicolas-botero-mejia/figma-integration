import { cpSync, mkdirSync, rmSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { tmpdir } from 'os';

export const FIGMA_PLUGIN_SKILLS_REPO = 'https://github.com/figma/mcp-server-guide.git';
export const SOUTHLEFT_SKILLS_REPO = 'https://github.com/southleft/figma-console-mcp-skills.git';

/** Required southleft skills for the token pipeline (always installed). */
export const SOUTHLEFT_SKILLS = [
  'figma-use',
  'figma-export-tokens',
  'figma-import-tokens',
  'figma-manage-variables',
];

function cloneRepo(url, dest) {
  execSync(`git clone --depth 1 "${url}" "${dest}"`, { stdio: 'pipe' });
}

function copyDirContents(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    if (name.startsWith('.')) continue;
    const from = join(src, name);
    const to = join(dest, name);
    cpSync(from, to, { recursive: true, force: true });
  }
}

/**
 * Hard-install Figma plugin skills (mcp-server-guide) then required southleft skills.
 * Plugin skills are installed first; southleft copies overwrite same-named folders.
 *
 * @param {string} targetDir e.g. .github/skills or .cursor/skills
 */
export function installSkills(targetDir) {
  const tmp = join(tmpdir(), `figma-integration-skills-${process.pid}-${Date.now()}`);
  mkdirSync(tmp, { recursive: true });
  mkdirSync(targetDir, { recursive: true });

  const installed = { plugin: [], southleft: [] };

  try {
    const pluginDir = join(tmp, 'figma-mcp-guide');
    cloneRepo(FIGMA_PLUGIN_SKILLS_REPO, pluginDir);
    const pluginSkills = join(pluginDir, 'skills');
    copyDirContents(pluginSkills, targetDir);
    installed.plugin = readdirSync(pluginSkills).filter((n) => {
      try {
        return statSync(join(pluginSkills, n)).isDirectory();
      } catch {
        return false;
      }
    });

    const southleftDir = join(tmp, 'figma-console-skills');
    cloneRepo(SOUTHLEFT_SKILLS_REPO, southleftDir);
    for (const skill of SOUTHLEFT_SKILLS) {
      cpSync(join(southleftDir, 'skills', skill), join(targetDir, skill), {
        recursive: true,
        force: true,
      });
      installed.southleft.push(skill);
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }

  return installed;
}

/** @param {'copilot'|'cursor'|'both'} editor */
export function skillTargetsForEditor(editor) {
  const targets = [];
  if (editor === 'copilot' || editor === 'both') targets.push('.github/skills');
  if (editor === 'cursor' || editor === 'both') targets.push('.cursor/skills');
  return targets;
}

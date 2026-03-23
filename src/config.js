import os from 'os';
import path from 'path';
import fs from 'fs-extra';
import { defaultSkills } from './registry/skills.js';

const CONFIG_DIR = path.join(os.homedir(), '.create-allthing');
const SKILLS_STACK_FILE = path.join(CONFIG_DIR, 'skills-stack.json');

/**
 * Get the config directory path.
 */
export function getConfigDir() {
  return CONFIG_DIR;
}

/**
 * Load the user's persisted skill stack.
 * Returns the default skills if no stack file exists.
 *
 * @returns {Promise<Array<{ repo: string, skill: string, label: string }>>}
 */
export async function loadUserSkillStack() {
  try {
    if (await fs.pathExists(SKILLS_STACK_FILE)) {
      const data = await fs.readJson(SKILLS_STACK_FILE);
      if (Array.isArray(data.skills) && data.skills.length > 0) {
        return data.skills;
      }
    }
  } catch {
    // Corrupted file — fall back to defaults
  }
  return [...defaultSkills];
}

/**
 * Save the user's skill stack to the global config directory.
 *
 * @param {Array<{ repo: string, skill: string, label: string }>} skills
 */
export async function saveUserSkillStack(skills) {
  await fs.ensureDir(CONFIG_DIR);
  await fs.writeJson(
    SKILLS_STACK_FILE,
    {
      version: '1',
      skills,
      updatedAt: new Date().toISOString(),
    },
    { spaces: 2 },
  );
}

/**
 * Check if the user has a custom skill stack saved.
 */
export async function hasCustomSkillStack() {
  return fs.pathExists(SKILLS_STACK_FILE);
}

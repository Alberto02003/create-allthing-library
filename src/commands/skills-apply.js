import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { loadUserSkillStack } from '../config.js';
import { installSkills } from '../runners/skills.js';

/**
 * Print a list of skills to the console.
 */
function printSkills(skills, indent = '    ') {
  for (const s of skills) {
    console.log(`${indent}${chalk.cyan(s.skill)} ${chalk.gray('←')} ${chalk.gray(s.repo)}`);
  }
}

/**
 * Read skills-lock.json from the target directory.
 * Returns null if not found.
 */
async function readSkillsLock(projectRoot) {
  const lockPath = path.join(projectRoot, '.claude', 'skills-lock.json');
  try {
    if (await fs.pathExists(lockPath)) {
      return await fs.readJson(lockPath);
    }
  } catch {
    // Corrupted lock file
  }
  return null;
}

/**
 * Write skills-lock.json to the target directory.
 */
async function writeSkillsLock(projectRoot, skills) {
  await fs.ensureDir(path.join(projectRoot, '.claude'));
  await fs.writeJson(
    path.join(projectRoot, '.claude', 'skills-lock.json'),
    {
      version: '1',
      skills: skills.map((s) => ({ repo: s.repo, skill: s.skill })),
      installedAt: new Date().toISOString(),
    },
    { spaces: 2 },
  );
}

/**
 * Check if the current directory looks like a project.
 */
async function detectProject(dir) {
  const markers = ['package.json', 'docker-compose.yml', '.claude'];
  for (const marker of markers) {
    if (await fs.pathExists(path.join(dir, marker))) {
      return true;
    }
  }
  return false;
}

/**
 * Handle `--list` / `-l` flag: print the user's current skill stack.
 */
async function listSkills() {
  console.log('');
  console.log(chalk.bold('  Your skill stack:'));
  console.log('');
  const skills = await loadUserSkillStack();
  if (skills.length === 0) {
    console.log(chalk.gray('    (empty)'));
  } else {
    printSkills(skills);
  }
  console.log('');
  console.log(chalk.gray(`  Total: ${skills.length} skill(s)`));
  console.log(chalk.gray('  Manage: create-allthing → Skills Stack'));
  console.log('');
}

/**
 * Handle `--stack-info` flag: print skills installed in the current project.
 */
async function stackInfo() {
  const cwd = process.cwd();
  const lock = await readSkillsLock(cwd);

  console.log('');
  if (!lock || !lock.skills || lock.skills.length === 0) {
    console.log(chalk.yellow('  No skills found installed in this project.'));
    console.log(chalk.gray('  Run: create-allthing skills (without flags) to install'));
  } else {
    console.log(chalk.bold('  Skills installed in this project:'));
    console.log('');
    for (const s of lock.skills) {
      console.log(`    ${chalk.cyan(s.skill)} ${chalk.gray('←')} ${chalk.gray(s.repo)}`);
    }
    console.log('');
    console.log(chalk.gray(`  Installed at: ${lock.installedAt ?? 'unknown'}`));
  }
  console.log('');
}

/**
 * Main interactive flow: apply skill stack to existing project.
 */
async function applySkills() {
  const cwd = process.cwd();

  console.log('');
  console.log(chalk.bold.cyan('  ── Apply Skills to Project ──'));
  console.log('');

  // Check if this looks like a project
  if (!(await detectProject(cwd))) {
    console.warn(chalk.yellow('  ⚠  No project detected in the current directory.'));
    console.warn(chalk.gray(`     (${cwd})`));
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: 'Continue anyway?',
        default: false,
      },
    ]);
    if (!proceed) {
      console.log(chalk.yellow('\n  Cancelled.'));
      process.exit(0);
    }
  }

  // Load user's skill stack
  const userSkills = await loadUserSkillStack();

  if (userSkills.length === 0) {
    console.log(chalk.yellow('  Your skill stack is empty.'));
    console.log(chalk.gray('  Run: create-allthing → Skills Stack to configure'));
    process.exit(0);
  }

  // Read existing skills-lock
  const lock = await readSkillsLock(cwd);
  const installedSkills = lock?.skills ?? [];

  // Determine which skills are new
  const newSkills = userSkills.filter(
    (s) => !installedSkills.some((i) => i.repo === s.repo && i.skill === s.skill),
  );

  console.log(chalk.bold('  Your stack:'));
  printSkills(userSkills);
  console.log('');

  if (installedSkills.length > 0) {
    console.log(chalk.bold(`  Already installed: ${installedSkills.length}`));
    console.log(chalk.bold(`  New:               ${newSkills.length}`));
    console.log('');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: [
          ...(newSkills.length > 0
            ? [{ name: `Install only new ones (${newSkills.length})`, value: 'new' }]
            : []),
          { name: `Reinstall all (${userSkills.length})`, value: 'all' },
          { name: 'Cancel', value: 'cancel' },
        ],
      },
    ]);

    if (action === 'cancel') {
      console.log(chalk.yellow('\n  Cancelled.'));
      process.exit(0);
    }

    const skillsToInstall = action === 'new' ? newSkills : userSkills;

    if (skillsToInstall.length === 0) {
      console.log(chalk.green('\n  ✔ All skills are already installed.'));
      process.exit(0);
    }

    console.log('');
    await installSkills(cwd, skillsToInstall);
    await writeSkillsLock(cwd, userSkills);
  } else {
    // No existing skills — install all
    const { proceed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'proceed',
        message: `Install ${userSkills.length} skill(s)?`,
        default: true,
      },
    ]);

    if (!proceed) {
      console.log(chalk.yellow('\n  Cancelled.'));
      process.exit(0);
    }

    console.log('');
    await installSkills(cwd, userSkills);
    await writeSkillsLock(cwd, userSkills);
  }

  console.log('');
  console.log(chalk.bold.green('  ✔ Skills applied successfully'));
  console.log(chalk.gray(`    skills-lock: .claude/skills-lock.json`));
  console.log('');
}

// ── Entry point ──────────────────────────────────────────────────────────
const args = process.argv.slice(3); // skip: node, bin/create-allthing.js, 'skills'

if (args.includes('--list') || args.includes('-l')) {
  listSkills();
} else if (args.includes('--stack-info')) {
  stackInfo();
} else {
  applySkills().catch((err) => {
    if (err.name === 'ExitPromptError' || err.message?.includes('User force closed')) {
      console.log('\n' + chalk.yellow('  Cancelled.'));
      process.exit(0);
    }
    console.error(chalk.red('\n  Error:'), err.message);
    process.exit(1);
  });
}

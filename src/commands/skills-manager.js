import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { execa } from 'execa';
import { loadUserSkillStack, saveUserSkillStack } from '../config.js';
import { defaultSkills } from '../registry/skills.js';

/**
 * Print the current skill stack in a readable format.
 */
function printStack(skills) {
  if (skills.length === 0) {
    console.log(chalk.gray('    (empty — no skills defined)'));
    return;
  }
  for (const s of skills) {
    console.log(`    ${chalk.cyan(s.skill)} ${chalk.gray('←')} ${chalk.gray(s.repo)}`);
  }
}

/**
 * Check if find-skills is already installed in the current directory
 * by looking for it inside .claude/skills/.
 */
async function isFindSkillsInstalled() {
  const skillDir = path.join(process.cwd(), '.claude', 'skills');
  try {
    if (!(await fs.pathExists(skillDir))) return false;
    const entries = await fs.readdir(skillDir);
    return entries.some((e) => e.includes('find-skills'));
  } catch {
    return false;
  }
}

/**
 * Verify that a skill exists in a GitHub repo by running a dry-run install.
 * Returns true if the skill is valid, false otherwise.
 */
async function verifySkillExists(repo, skill) {
  const spinner = ora({
    text: `Verifying skill ${chalk.cyan(skill)} in ${chalk.gray(repo)}...`,
    color: 'cyan',
  }).start();

  try {
    await execa('npx', ['skills', 'add', repo, '--skill', skill, '-y'], {
      stdio: 'pipe',
      env: { ...process.env, npm_config_yes: 'true' },
      timeout: 30_000,
    });
    spinner.succeed(`Skill ${chalk.cyan(skill)} verified and installed successfully`);
    return true;
  } catch (err) {
    spinner.fail(
      `Could not verify skill ${chalk.cyan(skill)}: ${err.shortMessage ?? err.message}`,
    );
    return false;
  }
}

/**
 * Interactive skills stack manager.
 * Allows the user to view, add, remove, and restore default skills.
 */
export async function runSkillsManager() {
  console.log('');
  console.log(chalk.bold.cyan('  ── Skills Stack ──'));
  console.log('');

  let skills = await loadUserSkillStack();
  let changed = false;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.log('');
    console.log(chalk.bold('  Your current stack:'));
    printStack(skills);
    console.log('');

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: chalk.bold('What would you like to do?'),
        choices: [
          { name: 'Find and add skill (find-skills)', value: 'add' },
          { name: 'Remove skill from stack', value: 'remove' },
          { name: 'Restore default skills', value: 'restore' },
          { name: 'Save and return', value: 'save' },
        ],
      },
    ]);

    if (action === 'add') {
      console.log('');
      console.log(chalk.gray('  Opening skills finder...'));

      // Check if find-skills is already installed before installing it again
      const alreadyInstalled = await isFindSkillsInstalled();

      if (alreadyInstalled) {
        console.log(chalk.gray('  find-skills is already installed, skipping installation.'));
      } else {
        console.log(chalk.gray('  (This will run npx skills to browse available skills)'));
      }

      console.log('');

      try {
        if (alreadyInstalled) {
          // Run find-skills directly without reinstalling
          await execa('npx', ['skills', 'run', 'find-skills'], {
            stdio: 'inherit',
            env: { ...process.env, npm_config_yes: 'true' },
            timeout: 120_000,
          });
        } else {
          // Install and run find-skills
          await execa(
            'npx',
            ['skills', 'add', 'https://github.com/vercel-labs/skills', '--skill', 'find-skills'],
            {
              stdio: 'inherit',
              env: { ...process.env, npm_config_yes: 'true' },
              timeout: 120_000,
            },
          );
        }
      } catch (err) {
        console.warn(chalk.yellow(`  ⚠  find-skills failed: ${err.message}`));
      }

      // After find-skills runs, ask user to manually add the skill info to the stack
      console.log('');
      const { addManual } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addManual',
          message: 'Would you like to add a skill to your stack?',
          default: true,
        },
      ]);

      if (addManual) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'repo',
            message: 'Repository (owner/repo):',
            validate: (v) => (v.includes('/') ? true : 'Format: owner/repo'),
          },
          {
            type: 'input',
            name: 'skill',
            message: 'Skill name:',
            validate: (v) => (v.trim().length > 0 ? true : 'Required'),
          },
          {
            type: 'input',
            name: 'label',
            message: 'Short description:',
            default: (ans) => ans.skill,
          },
        ]);

        // Check for duplicates
        const exists = skills.some((s) => s.repo === answers.repo && s.skill === answers.skill);
        if (exists) {
          console.log(chalk.yellow(`  ⚠  ${answers.skill} already exists in your stack`));
        } else {
          // Verify the skill actually exists before adding
          console.log('');
          const isValid = await verifySkillExists(answers.repo, answers.skill);

          if (isValid) {
            skills.push({ repo: answers.repo, skill: answers.skill, label: answers.label });
            changed = true;
            console.log(chalk.green(`  ✔ ${answers.skill} added to stack`));
          } else {
            console.log(chalk.yellow(`  ⚠  Skill was not added to stack (could not verify)`));
            const { addAnyway } = await inquirer.prompt([
              {
                type: 'confirm',
                name: 'addAnyway',
                message: 'Add it anyway?',
                default: false,
              },
            ]);
            if (addAnyway) {
              skills.push({ repo: answers.repo, skill: answers.skill, label: answers.label });
              changed = true;
              console.log(chalk.green(`  ✔ ${answers.skill} added to stack`));
            }
          }
        }
      }
    } else if (action === 'remove') {
      if (skills.length === 0) {
        console.log(chalk.yellow('  No skills to remove'));
        continue;
      }

      const { toRemove } = await inquirer.prompt([
        {
          type: 'checkbox',
          name: 'toRemove',
          message: 'Select skills to remove:',
          choices: skills.map((s) => ({ name: `${s.skill} (${s.repo})`, value: s.skill })),
        },
      ]);

      if (toRemove.length > 0) {
        skills = skills.filter((s) => !toRemove.includes(s.skill));
        changed = true;
        console.log(chalk.green(`  ✔ ${toRemove.length} skill(s) removed`));
      }
    } else if (action === 'restore') {
      skills = [...defaultSkills];
      changed = true;
      console.log(chalk.green('  ✔ Stack restored to default skills'));
    } else if (action === 'save') {
      if (changed) {
        await saveUserSkillStack(skills);
        console.log(chalk.green('  ✔ Stack saved'));
      } else {
        console.log(chalk.gray('  No changes'));
      }
      break;
    }
  }
}

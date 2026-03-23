import chalk from 'chalk';
import inquirer from 'inquirer';
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
      console.log(chalk.gray('  (This will run npx skills to browse available skills)'));
      console.log('');

      try {
        // Run find-skills interactively so the user can browse and select
        await execa(
          'npx',
          ['skills', 'add', 'https://github.com/vercel-labs/skills', '--skill', 'find-skills'],
          {
            stdio: 'inherit',
            env: { ...process.env, npm_config_yes: 'true' },
            timeout: 120_000,
          },
        );
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
          skills.push({ repo: answers.repo, skill: answers.skill, label: answers.label });
          changed = true;
          console.log(chalk.green(`  ✔ ${answers.skill} added to stack`));
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

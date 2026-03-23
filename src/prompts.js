import inquirer from 'inquirer';
import chalk from 'chalk';
import { frontends } from './registry/frontends.js';
import { backends } from './registry/backends.js';
import { databases } from './registry/databases.js';

/**
 * Sanitize a project name: replace spaces and underscores with hyphens,
 * lowercase, strip illegal characters.
 */
function sanitizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '');
}

/**
 * Validate project name — must produce a non-empty sanitized string.
 */
function validateProjectName(input) {
  const sanitized = sanitizeName(input);
  if (!sanitized || sanitized.length === 0) {
    return 'Project name must contain at least one valid character (letters, numbers, hyphens).';
  }
  if (sanitized.length > 214) {
    return 'Project name must be 214 characters or fewer.';
  }
  return true;
}

export async function runPrompts() {
  const frontendChoices = frontends.map((f) => ({ name: f.label, value: f.id }));
  const backendChoices = backends.map((b) => ({ name: b.label, value: b.id }));
  const databaseChoices = databases.map((d) => ({ name: d.label, value: d.id }));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'rawProjectName',
      message: chalk.bold('Project name:'),
      default: 'my-app',
      validate: validateProjectName,
      filter: (input) => input.trim(),
    },
    {
      type: 'list',
      name: 'frontend',
      message: chalk.bold('Frontend framework:'),
      choices: frontendChoices,
    },
    {
      type: 'list',
      name: 'backend',
      message: chalk.bold('Backend framework:'),
      choices: backendChoices,
    },
    {
      type: 'list',
      name: 'database',
      message: chalk.bold('Database:'),
      choices: databaseChoices,
    },
    {
      type: 'confirm',
      name: 'jenkinsfile',
      message: chalk.bold('Generate Jenkinsfile (CI/CD)?'),
      default: true,
    },
    {
      type: 'confirm',
      name: 'confirm',
      message: (ans) => {
        const name = sanitizeName(ans.rawProjectName);
        const fe = frontends.find((f) => f.id === ans.frontend)?.label ?? ans.frontend;
        const be = backends.find((b) => b.id === ans.backend)?.label ?? ans.backend;
        const db = databases.find((d) => d.id === ans.database)?.label ?? ans.database;
        console.log('');
        console.log(chalk.bold('  Summary:'));
        console.log('    ' + chalk.gray('Name:     ') + chalk.cyan(name));
        console.log('    ' + chalk.gray('Frontend: ') + chalk.yellow(fe));
        console.log('    ' + chalk.gray('Backend:  ') + chalk.yellow(be));
        console.log('    ' + chalk.gray('Database: ') + chalk.yellow(db));
        console.log('    ' + chalk.gray('Jenkins:  ') + chalk.yellow(ans.jenkinsfile ? 'Yes' : 'No'));
        console.log('');
        return chalk.bold('Create project?');
      },
      default: true,
    },
  ]);

  // Apply sanitization to the project name
  const projectName = sanitizeName(answers.rawProjectName);

  return {
    projectName,
    frontend: answers.frontend,
    backend: answers.backend,
    database: answers.database,
    jenkinsfile: answers.jenkinsfile,
    confirm: answers.confirm,
  };
}

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import chalk from 'chalk';
import { runPrompts } from './prompts.js';
import { scaffold } from './scaffold.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printBanner() {
  console.log('');
  console.log(chalk.bold.cyan('  ╔═══════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('  ║') + chalk.bold.white('       create-allthing  v0.1.0          ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ║') + chalk.gray('   Full-stack scaffolder with Docker    ') + chalk.bold.cyan('║'));
  console.log(chalk.bold.cyan('  ╚═══════════════════════════════════════╝'));
  console.log('');
}

function printSummary(projectName, options) {
  const cwd = process.cwd();
  const projectPath = path.join(cwd, projectName);

  console.log('');
  console.log(chalk.bold.green('  ✔ Project created successfully!'));
  console.log('');
  console.log(chalk.bold('  Project:  ') + chalk.cyan(projectName));
  console.log(chalk.bold('  Path:     ') + chalk.gray(projectPath));
  console.log(chalk.bold('  Frontend: ') + chalk.yellow(options.frontend));
  console.log(chalk.bold('  Backend:  ') + chalk.yellow(options.backend));
  console.log(chalk.bold('  Database: ') + chalk.yellow(options.database));
  console.log('');
  console.log(chalk.bold('  Next steps:'));
  console.log('');
  console.log('    ' + chalk.cyan(`cd ${projectName}`));

  if (options.database !== 'none') {
    console.log('    ' + chalk.cyan('cp .env.example .env') + chalk.gray('   # then fill in secrets'));
  }

  console.log('    ' + chalk.cyan('docker compose up --build'));
  console.log('');
  console.log(chalk.bold('  Ports:'));
  console.log('    ' + chalk.gray('Frontend  → ') + chalk.white('http://localhost:3000'));
  console.log('    ' + chalk.gray('Backend   → ') + chalk.white('http://localhost:8080'));

  if (options.database === 'postgres') {
    console.log('    ' + chalk.gray('PostgreSQL → ') + chalk.white('localhost:5432'));
  } else if (options.database === 'mongodb') {
    console.log('    ' + chalk.gray('MongoDB   → ') + chalk.white('localhost:27017'));
  }

  console.log('');
  console.log(chalk.bold('  Useful commands:'));
  console.log('    ' + chalk.cyan('code ' + projectName + '.code-workspace') + chalk.gray('   # open in VS Code'));
  console.log('    ' + chalk.cyan('docker compose logs -f') + chalk.gray('          # follow logs'));
  console.log('    ' + chalk.cyan('docker compose down -v') + chalk.gray('          # stop and clean'));
  console.log('');
  console.log(chalk.bold('  Testing:'));

  if (options.backend === 'fastapi') {
    console.log('    ' + chalk.cyan('cd backend && uv run pytest'));
  } else if (options.backend === 'dotnet') {
    console.log('    ' + chalk.cyan('cd backend && dotnet test'));
  }

  console.log('');
  console.log(chalk.bold.green('  Happy coding! 🚀'));
  console.log('');
}

async function main() {
  printBanner();

  let answers;
  try {
    answers = await runPrompts();
  } catch (err) {
    if (err.name === 'ExitPromptError' || err.message?.includes('User force closed')) {
      console.log('\n' + chalk.yellow('  Cancelled.'));
      process.exit(0);
    }
    console.error(chalk.red('\n  Error during prompts:'), err.message);
    process.exit(1);
  }

  const { projectName, frontend, backend, database, confirm } = answers;

  if (!confirm) {
    console.log('\n' + chalk.yellow('  Cancelled. No files were created.'));
    process.exit(0);
  }

  const cwd = process.cwd();
  const projectRoot = path.join(cwd, projectName);

  if (await fs.pathExists(projectRoot)) {
    console.error(chalk.red(`\n  Error: directory "${projectName}" already exists.`));
    console.error(chalk.gray('  Please choose a different project name or remove the existing directory.'));
    process.exit(1);
  }

  try {
    await scaffold({ projectName, projectRoot, frontend, backend, database });
    printSummary(projectName, { frontend, backend, database });
  } catch (err) {
    console.error(chalk.red('\n  Fatal error during scaffolding:'), err.message);
    if (process.env.DEBUG) {
      console.error(err.stack);
    }
    process.exit(1);
  }
}

main();

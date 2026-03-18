import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

const isWindows = process.platform === 'win32';

/**
 * Check whether `git` is available on PATH.
 */
async function findGit() {
  try {
    const cmd = isWindows ? 'where' : 'which';
    const result = await execa(cmd, ['git'], { stdio: 'pipe' });
    return result.stdout.trim().split('\n')[0].trim();
  } catch {
    return null;
  }
}

/**
 * Initialise a git repository in projectRoot, stage all files and make
 * the initial commit.
 */
export async function runGit(projectRoot) {
  const spinner = ora({ text: 'Initialising git repository...', color: 'magenta' }).start();

  const gitPath = await findGit();
  if (!gitPath) {
    spinner.warn(chalk.yellow('git not found — skipping git init'));
    return;
  }

  const execGit = (args) =>
    execa('git', args, { cwd: projectRoot, stdio: 'pipe' });

  try {
    await execGit(['init']);
    spinner.text = 'Staging files...';

    await execGit(['add', '.']);
    spinner.text = 'Creating initial commit...';

    await execGit([
      'commit',
      '-m',
      'Initial project structure',
      '--author',
      'create-allthing <noreply@create-allthing>',
    ]);

    spinner.succeed(chalk.green('Git repository initialised'));
  } catch (err) {
    // git init itself might fail if git user is not configured; that's okay
    if (err.message?.includes('Please tell me who you are')) {
      // Try again without --author
      try {
        await execGit(['add', '.']);
        await execGit(['commit', '-m', 'Initial project structure', '--allow-empty-message']);
        spinner.succeed(chalk.green('Git repository initialised'));
      } catch {
        spinner.warn(chalk.yellow('Git commit failed — repository was initialised but not committed'));
        console.warn(chalk.gray('     Run: git config user.email "you@example.com" && git config user.name "Your Name"'));
        console.warn(chalk.gray('     Then: git add . && git commit -m "Initial project structure"'));
      }
    } else {
      spinner.warn(chalk.yellow(`Git init failed: ${err.message}`));
      throw err;
    }
  }
}

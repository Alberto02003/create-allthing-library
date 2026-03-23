import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

/**
 * Install a list of skills using `npx skills add <repo> --skill <name> -y`.
 * Each skill gets its own ora spinner showing [N/total] progress.
 * Failures are non-fatal; a warning is printed and installation continues.
 *
 * @param {string} projectRoot — target project directory
 * @param {Array<{ repo: string, skill: string, label: string }>} skills — skills to install
 */
export async function installSkills(projectRoot, skills) {
  const total = skills.length;

  if (total === 0) {
    console.log(chalk.gray('  No skills to install'));
    return;
  }

  for (let i = 0; i < total; i++) {
    const skill = skills[i];
    const prefix = chalk.gray(`[${i + 1}/${total}]`);
    const spinner = ora({
      text: `${prefix} Installing skill: ${chalk.cyan(skill.label ?? skill.skill)}`,
      color: 'cyan',
    }).start();

    try {
      await execa('npx', ['skills', 'add', skill.repo, '--skill', skill.skill, '-y'], {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env, npm_config_yes: 'true' },
        timeout: 60_000,
      });

      spinner.succeed(
        `${prefix} ${chalk.green('✔')} ${chalk.cyan(skill.skill)} installed`,
      );
    } catch (err) {
      spinner.warn(
        `${prefix} ${chalk.yellow('⚠')} Skill "${skill.skill}" could not be installed: ${err.shortMessage ?? err.message}`,
      );
    }
  }
}

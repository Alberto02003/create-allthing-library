import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

/**
 * The 5 skills to install into every scaffolded project.
 * Each entry:
 *   name  – skill name passed to `npx skills add`
 *   label – friendly description shown in the spinner
 */
const SKILLS = [
  { name: 'feature', label: 'feature  — build new features' },
  { name: 'fix',     label: 'fix      — diagnose & fix bugs' },
  { name: 'review',  label: 'review   — code review assistant' },
  { name: 'test',    label: 'test     — write & run tests' },
  { name: 'deploy',  label: 'deploy   — Docker / CI deployment helper' },
];

/**
 * Install all registered skills using `npx skills add <name> -y`.
 * Each skill gets its own ora spinner showing [N/5] progress.
 * Failures are non-fatal; a warning is printed and installation continues.
 */
export async function installSkills(projectRoot) {
  const total = SKILLS.length;

  for (let i = 0; i < total; i++) {
    const skill = SKILLS[i];
    const prefix = chalk.gray(`[${i + 1}/${total}]`);
    const spinner = ora({
      text: `${prefix} Installing skill: ${chalk.cyan(skill.label)}`,
      color: 'cyan',
    }).start();

    try {
      await execa('npx', ['skills', 'add', skill.name, '-y'], {
        cwd: projectRoot,
        stdio: 'pipe',
        // Allow npx to download the skills package without interaction
        env: { ...process.env, npm_config_yes: 'true' },
        timeout: 60_000, // 60 s per skill
      });

      spinner.succeed(
        `${prefix} ${chalk.green('✔')} ${chalk.cyan(skill.name)} skill installed`,
      );
    } catch (err) {
      spinner.warn(
        `${prefix} ${chalk.yellow('⚠')} Skill "${skill.name}" could not be installed: ${err.shortMessage ?? err.message}`,
      );
    }
  }
}

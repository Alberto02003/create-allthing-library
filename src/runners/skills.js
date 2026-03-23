import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

/**
 * The external `npx skills add` tool installs skills for multiple agents:
 *   .agents/skills/<name>/  — real files (universal store)
 *   .claude/skills/<name>   — symlink (Claude Code)
 *   .agent/skills/<name>    — symlink (Antigravity)
 *
 * We only need .claude/ and .agents/. This function removes the extra
 * .agent/ directory and the root skills-lock.json the tool creates
 * (create-allthing manages its own lock at .claude/skills-lock.json).
 */
async function cleanupExtraAgentDirs(projectRoot) {
  const extraDirs = ['.agent'];
  for (const dir of extraDirs) {
    const fullPath = path.join(projectRoot, dir);
    if (await fs.pathExists(fullPath)) {
      await fs.remove(fullPath);
    }
  }
  // The external tool also creates a root skills-lock.json — remove it
  const externalLock = path.join(projectRoot, 'skills-lock.json');
  if (await fs.pathExists(externalLock)) {
    await fs.remove(externalLock);
  }
}

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

  // Clean up directories created by the external tool that we don't need
  await cleanupExtraAgentDirs(projectRoot);
}

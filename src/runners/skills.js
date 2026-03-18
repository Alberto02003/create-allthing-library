import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

/**
 * Skills to install into every scaffolded project.
 * Format: `npx skills add <repo> --skill <skill> -y`
 *
 * Each entry:
 *   repo  – GitHub owner/repo that hosts the skill
 *   skill – specific skill name inside that repo
 *   label – friendly description shown in the spinner
 */
const SKILLS = [
  { repo: 'anthropics/skills',              skill: 'frontend-design',            label: 'frontend-design            — production-grade UI design' },
  { repo: 'dammyjay93/interface-design',    skill: 'interface-design',           label: 'interface-design           — UI/UX interface design' },
  { repo: 'vercel-labs/agent-skills',       skill: 'vercel-react-best-practices', label: 'vercel-react-best-practices — React & Next.js performance' },
  { repo: 'obra/superpowers',              skill: 'brainstorming',              label: 'brainstorming              — explore requirements before coding' },
  { repo: 'obra/superpowers',              skill: 'systematic-debugging',       label: 'systematic-debugging       — diagnose & fix bugs' },
  { repo: 'composiohq/awesome-claude-skills', skill: 'changelog-generator',     label: 'changelog-generator        — auto changelog from git commits' },
  { repo: 'wshobson/agents',               skill: 'api-design-principles',      label: 'api-design-principles      — REST & GraphQL API design' },
  { repo: 'wshobson/agents',               skill: 'error-handling-patterns',    label: 'error-handling-patterns    — robust error handling' },
  { repo: 'wshobson/agents',               skill: 'postgresql-table-design',    label: 'postgresql-table-design    — PostgreSQL best practices' },
  { repo: 'wshobson/agents',               skill: 'prompt-engineering-patterns', label: 'prompt-engineering-patterns — prompt engineering' },
];

/**
 * Install all registered skills using `npx skills add <repo> --skill <name> -y`.
 * Each skill gets its own ora spinner showing [N/total] progress.
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

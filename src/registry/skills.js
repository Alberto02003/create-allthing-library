/**
 * Default skill definitions.
 *
 * Each entry:
 *   repo   – GitHub owner/repo hosting the skill
 *   skill  – specific skill identifier within the repo
 *   label  – friendly description shown during installation
 */
export const defaultSkills = [
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

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';

import { backends } from './registry/backends.js';
import { databases } from './registry/databases.js';
import { runNpm } from './runners/npm.js';
import { runUv } from './runners/uv.js';
import { runDotnet } from './runners/dotnet.js';
import { runGit } from './runners/git.js';
import { installSkills } from './runners/skills.js';
import { generateCompose } from './generators/compose.js';
import { generateEnv } from './generators/env.js';
import { generateReadme } from './generators/readme.js';
import { generateWorkspace } from './generators/workspace.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * Create a directory and log it.
 */
async function mkdirSafe(dir) {
  await fs.ensureDir(dir);
}

/**
 * Copy a template directory if it exists, silently skip if not.
 */
async function copyTemplate(templateSubPath, dest) {
  const src = path.join(TEMPLATES_DIR, templateSubPath);
  if (await fs.pathExists(src)) {
    await fs.copy(src, dest, { overwrite: false });
  }
}

/**
 * Scaffold the frontend (React + Vite).
 */
async function scaffoldFrontend(projectRoot, frontendId) {
  console.log('\n' + chalk.bold.blue('  [1/7] Setting up frontend...'));

  await runNpm(projectRoot);

  // Copy Dockerfile + nginx.conf + .dockerignore into frontend/
  const frontendDir = path.join(projectRoot, 'frontend');
  await copyTemplate('frontend', frontendDir);
}

/**
 * Scaffold the backend.
 */
async function scaffoldBackend(projectRoot, backendId) {
  console.log('\n' + chalk.bold.blue('  [2/7] Setting up backend...'));

  const backendMeta = backends.find((b) => b.id === backendId);
  const backendDir = path.join(projectRoot, 'backend');

  if (backendId === 'fastapi') {
    await runUv(projectRoot);
  } else if (backendId === 'dotnet') {
    await runDotnet(projectRoot);
  }

  // Ensure backend directory exists (runner may have created it)
  await mkdirSafe(backendDir);

  // Create domain subdirectories
  if (backendMeta?.dirs) {
    for (const dir of backendMeta.dirs) {
      await mkdirSafe(path.join(backendDir, dir));
      // Add a .gitkeep so git tracks the empty dir
      await fs.ensureFile(path.join(backendDir, dir, '.gitkeep'));
    }
  }

  // Copy Dockerfile + .dockerignore from templates
  await copyTemplate(path.join('backend', backendId), backendDir);
}

/**
 * Scaffold database-related files (currently just placeholder dirs for migrations).
 */
async function scaffoldDatabase(projectRoot, databaseId) {
  if (databaseId === 'none') return;

  console.log('\n' + chalk.bold.blue('  [3/7] Preparing database structure...'));

  const migrationsDir = path.join(projectRoot, 'infra', 'db', 'migrations');
  await mkdirSafe(migrationsDir);
  await fs.ensureFile(path.join(migrationsDir, '.gitkeep'));

  const seedsDir = path.join(projectRoot, 'infra', 'db', 'seeds');
  await mkdirSafe(seedsDir);
  await fs.ensureFile(path.join(seedsDir, '.gitkeep'));
}

/**
 * Generate .gitignore for the project root.
 */
async function generateGitignore(projectRoot, backendId) {
  const lines = [
    '# Dependencies',
    'node_modules/',
    '',
    '# Environment',
    '.env',
    '*.env',
    '',
    '# Build outputs',
    'dist/',
    'build/',
    '',
    '# Docker',
    'docker-data/',
    '',
    '# OS',
    '.DS_Store',
    'Thumbs.db',
    '',
    '# Editors',
    '.vscode/settings.json',
    '*.suo',
    '*.user',
    '',
  ];

  if (backendId === 'fastapi') {
    lines.push(
      '# Python',
      '__pycache__/',
      '*.pyc',
      '*.pyo',
      '.venv/',
      '*.egg-info/',
      '.pytest_cache/',
      '.mypy_cache/',
      '',
    );
  } else if (backendId === 'dotnet') {
    lines.push(
      '# .NET',
      'backend/bin/',
      'backend/obj/',
      '*.user',
      '*.suo',
      '',
    );
  }

  await fs.writeFile(path.join(projectRoot, '.gitignore'), lines.join('\n'), 'utf-8');
}

/**
 * Generate skills-lock.json — tracks installed CLI skills.
 */
async function generateSkillsLock(projectRoot) {
  const skillsLock = {
    version: '1',
    skills: [
      { name: 'feature', version: 'latest' },
      { name: 'fix', version: 'latest' },
      { name: 'review', version: 'latest' },
      { name: 'test', version: 'latest' },
      { name: 'deploy', version: 'latest' },
    ],
    installedAt: new Date().toISOString(),
  };
  await fs.writeJson(path.join(projectRoot, '.claude', 'skills-lock.json'), skillsLock, {
    spaces: 2,
  });
}

/**
 * Copy agents.md to docs/.
 */
async function copyAgentsMd(projectRoot) {
  const agentsContent = `# Agent Instructions

## Overview
This project was scaffolded with \`create-allthing\`. AI agents (Copilot, Claude, etc.)
should read this document before making changes.

## Project structure
\`\`\`
.
├── frontend/       React + Vite SPA
├── backend/        API server
├── infra/          Infrastructure as code (docker-compose, scripts, db)
├── mcp/            Model Context Protocol tools
├── docs/           Specifications and architecture docs
└── .claude/        AI agent skills and config
\`\`\`

## Rules
1. Never commit secrets — use \`.env\` (gitignored) and \`.env.example\`.
2. All public API routes must have a corresponding integration test.
3. Docker Compose is the single source of truth for local dev.
4. Prefer small, focused PRs.

## Skills available
Run \`npx skills list\` to see all registered skills for this project.
`;
  await fs.ensureDir(path.join(projectRoot, 'docs'));
  await fs.writeFile(path.join(projectRoot, 'docs', 'agents.md'), agentsContent, 'utf-8');
}

/**
 * Main scaffold entry point.
 */
export async function scaffold({ projectName, projectRoot, frontend, backend, database }) {
  // ── Step 0: Create root + base dirs ───────────────────────────────────────
  const spinner = ora({ text: 'Creating project structure...', color: 'cyan' }).start();

  try {
    await mkdirSafe(projectRoot);
    await mkdirSafe(path.join(projectRoot, 'infra', 'scripts'));
    await mkdirSafe(path.join(projectRoot, 'mcp'));
    await mkdirSafe(path.join(projectRoot, 'docs', 'specs'));
    await mkdirSafe(path.join(projectRoot, '.claude', 'skills'));
    spinner.succeed(chalk.green('Project structure created'));
  } catch (err) {
    spinner.fail('Failed to create base directories');
    throw err;
  }

  // ── Step 1: Frontend ───────────────────────────────────────────────────────
  try {
    await scaffoldFrontend(projectRoot, frontend);
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  Frontend setup failed: ${err.message}`));
    console.warn(chalk.gray('     You can set it up manually with: npm create vite@latest frontend -- --template react'));
  }

  // ── Step 2: Backend ────────────────────────────────────────────────────────
  try {
    await scaffoldBackend(projectRoot, backend);
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  Backend setup failed: ${err.message}`));
    console.warn(chalk.gray('     The directory structure was still created.'));
  }

  // ── Step 3: Database ───────────────────────────────────────────────────────
  try {
    await scaffoldDatabase(projectRoot, database);
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  Database structure setup failed: ${err.message}`));
  }

  // ── Step 4: docker-compose.yml ────────────────────────────────────────────
  console.log('\n' + chalk.bold.blue('  [4/7] Generating Docker Compose...'));
  try {
    const composeContent = generateCompose({ backend, database });
    await fs.writeFile(path.join(projectRoot, 'docker-compose.yml'), composeContent, 'utf-8');
    console.log(chalk.green('  ✔ docker-compose.yml'));
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  docker-compose generation failed: ${err.message}`));
  }

  // ── Step 5: .env files ────────────────────────────────────────────────────
  console.log('\n' + chalk.bold.blue('  [5/7] Generating environment files...'));
  try {
    const { envExample, envLocal } = generateEnv({ database });
    await fs.writeFile(path.join(projectRoot, '.env.example'), envExample, 'utf-8');
    await fs.writeFile(path.join(projectRoot, '.env'), envLocal, 'utf-8');
    console.log(chalk.green('  ✔ .env.example + .env'));
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  .env generation failed: ${err.message}`));
  }

  // ── Step 6: .gitignore ────────────────────────────────────────────────────
  try {
    await generateGitignore(projectRoot, backend);
    console.log(chalk.green('  ✔ .gitignore'));
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  .gitignore generation failed: ${err.message}`));
  }

  // ── Step 7: .code-workspace ───────────────────────────────────────────────
  console.log('\n' + chalk.bold.blue('  [6/7] Generating workspace & docs...'));
  try {
    const workspaceContent = generateWorkspace({ projectName, backend });
    await fs.writeFile(
      path.join(projectRoot, `${projectName}.code-workspace`),
      workspaceContent,
      'utf-8',
    );
    console.log(chalk.green('  ✔ ' + projectName + '.code-workspace'));
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  Workspace generation failed: ${err.message}`));
  }

  // ── Step 8: README.md ─────────────────────────────────────────────────────
  try {
    const readmeContent = generateReadme({ projectName, backend, database });
    await fs.writeFile(path.join(projectRoot, 'README.md'), readmeContent, 'utf-8');
    console.log(chalk.green('  ✔ README.md'));
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  README generation failed: ${err.message}`));
  }

  // ── Step 9: agents.md ─────────────────────────────────────────────────────
  try {
    await copyAgentsMd(projectRoot);
    console.log(chalk.green('  ✔ docs/agents.md'));
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  agents.md generation failed: ${err.message}`));
  }

  // ── Step 10: skills-lock.json ─────────────────────────────────────────────
  try {
    await generateSkillsLock(projectRoot);
    console.log(chalk.green('  ✔ .claude/skills-lock.json'));
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  skills-lock.json generation failed: ${err.message}`));
  }

  // ── Step 11: Install skills ───────────────────────────────────────────────
  console.log('\n' + chalk.bold.blue('  [7/7] Installing AI skills...'));
  try {
    await installSkills(projectRoot);
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  Skills install failed: ${err.message}`));
    console.warn(chalk.gray('     You can install them later with: npx skills add <skill> -y'));
  }

  // ── Step 12: Git init ─────────────────────────────────────────────────────
  try {
    await runGit(projectRoot);
  } catch (err) {
    console.warn(chalk.yellow(`  ⚠  Git init failed: ${err.message}`));
    console.warn(chalk.gray('     You can initialise git manually with: git init && git add . && git commit -m "Initial project structure"'));
  }
}

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**create-allthing** is a Node.js CLI that scaffolds full-stack projects with Docker, standardized structure, and AI-agent readiness. Users run `npx create-allthing`, answer interactive prompts (project name, frontend, backend, database), and get a complete project with docker-compose, git, and Claude Code skills.

## Commands

```bash
# Install dependencies
npm install

# Run the CLI locally
node bin/create-allthing.js

# Link globally for local testing
npm link
create-allthing

# Publish to npm
npm login && npm publish
```

There are no test, lint, or build commands — this is a pure ES module project with no compilation step.

## Architecture

### Entry Point & Flow

`bin/create-allthing.js` → `src/cli.js` → `src/prompts.js` (gather input) → `src/scaffold.js` (12-step pipeline) → output summary.

### Registry Pattern (Extensibility)

Stack options are defined in `src/registry/` (frontends.js, backends.js, databases.js). Prompts, scaffold, and generators read from these registries automatically. To add a new stack option:

1. Add entry to the appropriate registry file in `src/registry/`
2. Create templates in `templates/backend/<id>/` (or `frontend/`)
3. Create a runner in `src/runners/` if it needs custom CLI initialization

No changes needed to prompts, scaffold, or generators.

### Key Directories

- **`src/generators/`** — Dynamic file generators (compose.js, env.js, readme.js, workspace.js) that produce config files based on user selections
- **`src/runners/`** — Framework-specific setup logic (npm.js for React/Vite, uv.js for FastAPI, dotnet.js for .NET, git.js, skills.js)
- **`src/registry/`** — Stack definitions with metadata (dirs, healthchecks, ports, images)
- **`templates/`** — Static files (Dockerfiles, nginx.conf, sample code) copied into generated projects

### Scaffolding Pipeline (`src/scaffold.js`)

Executes 12 sequential steps: create dirs → scaffold frontend → scaffold backend → scaffold database → generate compose → generate env → generate gitignore → generate workspace → generate readme → copy agents.md → generate skills-lock → install skills → git init. Each step has non-fatal error handling (warns and continues).

## Conventions

- **ES Modules** throughout (`"type": "module"` in package.json) — use `import`/`export`, not `require`
- **Async/await** for all async operations
- **Graceful degradation** — runners detect tool availability and fall back to manual structure creation if tools (uv, dotnet, git) are missing
- **Cross-platform** — runners use `which`/`where` detection for Windows/Unix compatibility
- **Spanish language** — prompts, README, and user-facing output are in Spanish
- **Minimal dependencies** — only 5 runtime deps (chalk, execa, fs-extra, inquirer, ora); avoid adding unnecessary packages
- **Template copying** uses `overwrite: false` to avoid clobbering existing files

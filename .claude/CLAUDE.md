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

`bin/create-allthing.js` routes subcommands: `skills` → `src/commands/skills-apply.js`, everything else → `src/cli.js`. The main CLI shows a menu (Create project / Skills Stack / Exit). The create flow: `src/cli.js` → `src/prompts.js` (gather input) → `src/scaffold.js` (13-step pipeline) → output summary.

### Registry Pattern (Extensibility)

Stack options are defined in `src/registry/` (frontends.js, backends.js, databases.js, skills.js). Prompts, scaffold, and generators read from these registries automatically. To add a new stack option:

1. Add entry to the appropriate registry file in `src/registry/`
2. Create templates in `templates/backend/<id>/` (or `frontend/`)
3. Create a runner in `src/runners/` if it needs custom CLI initialization

No changes needed to prompts, scaffold, or generators.

### Key Directories

- **`src/generators/`** — Dynamic file generators (compose.js, env.js, readme.js, workspace.js, jenkinsfile.js) that produce config files based on user selections
- **`src/runners/`** — Framework-specific setup logic (npm.js for React/Vite, angular.js, uv.js for FastAPI, dotnet.js for .NET, git.js, skills.js)
- **`src/commands/`** — Subcommands: skills-apply.js (CLI `skills` subcommand), skills-manager.js (interactive stack editor from main menu)
- **`src/registry/`** — Stack definitions with metadata (dirs, healthchecks, ports, images) + default skills list
- **`src/config.js`** — Global user config at `~/.create-allthing/` (persists skill stack across projects)
- **`templates/`** — Static files (Dockerfiles, nginx.conf, sample code) copied into generated projects. Template dir names must match registry `id` values

### Registry Entry Schema

Each registry entry has: `id` (internal key matching template dir name), `label` (shown in prompts), and type-specific fields like `dirs`, `healthcheck` (with `.compose` and `.dockerfile` sub-fields), `image`, `defaultPort`. Generators read these fields to produce compose, env, and readme content.

### Scaffolding Pipeline (`src/scaffold.js`)

Executes 13 internal steps (displayed to the user as 7 stages): create dirs → scaffold frontend → scaffold backend → scaffold database → generate compose → generate env → generate gitignore → generate workspace → generate readme → generate Jenkinsfile (if selected) → copy agents.md → generate skills-lock + install skills → git init. Each step has non-fatal error handling (warns and continues).

### Skills System

Default skills are defined in `src/registry/skills.js`. The user's custom stack is persisted at `~/.create-allthing/skills-stack.json` (managed by `src/config.js`). During scaffolding, `loadUserSkillStack()` reads the user's stack (or defaults), writes `skills-lock.json`, and calls `installSkills()` from `src/runners/skills.js`. The `create-allthing skills` subcommand can apply the stack to existing projects.

## Conventions

- **ES Modules** throughout (`"type": "module"` in package.json) — use `import`/`export`, not `require`
- **Async/await** for all async operations
- **Graceful degradation** — runners detect tool availability and fall back to manual structure creation if tools (uv, dotnet, git) are missing
- **Cross-platform** — runners use `which`/`where` detection for Windows/Unix compatibility
- **Spanish language** — prompts, README, and user-facing output are in Spanish
- **Minimal dependencies** — only 5 runtime deps (chalk, execa, fs-extra, inquirer, ora); avoid adding unnecessary packages
- **Template copying** uses `overwrite: false` to avoid clobbering existing files

# create-allthing

CLI to scaffold full-stack projects with a standardized structure, Docker included, and AI-agent ready.

```bash
npx create-allthing
```

---

## Features

- Interactive prompt-guided scaffolding
- Main menu: **Create project** or **Skills Stack** management
- Multi-stage Docker builds optimized per technology
- Healthchecks configured in Dockerfile and docker-compose
- Network isolation: frontend-net / backend-net
- Environment variables properly injected at build time
- Nginx with SPA routing (`try_files`) ready for client-side routing
- Predictable structure designed for AI agents (Claude Code, Cursor, Codex)
- Configurable Claude Code skill stacks with global persistence
- Jenkinsfile generation with multi-environment pipeline (dev → staging → prod)
- Git repo initialized with initial commit
- Apply skills to existing projects via `create-allthing skills`

---

## Available Stacks

| Layer | Options |
|---|---|
| Frontend | React (Vite) · Angular |
| Backend | Python + FastAPI · .NET WebAPI |
| Database | PostgreSQL · MongoDB · None |
| CI/CD | Jenkinsfile (optional) |

---

## Usage

```bash
npx create-allthing
```

The CLI shows a main menu:

1. **Create project** — the full scaffolding wizard
2. **Skills Stack** — manage your AI skill stack (persisted globally)

### Create Project Flow

1. **Project name** — used as folder name and workspace
2. **Frontend** — React (Vite) or Angular
3. **Backend** — Python + FastAPI or .NET WebAPI
4. **Database** — PostgreSQL, MongoDB, or None
5. **Jenkinsfile** — generate CI/CD pipeline (yes/no)
6. **Confirmation** — summary before creating anything

Once confirmed, the CLI:

- Creates the folder structure
- Runs `npm create vite` / `ng new` / `uv init` / `dotnet new webapi` as needed
- Generates `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`, `.code-workspace`
- Generates `Jenkinsfile` (if selected) with dev → staging → prod pipeline
- Installs Claude Code skills from your saved stack
- Runs `git init` with initial commit

### Skills Stack Management

Select **Skills Stack** from the main menu to:

- **Find and add skill** — uses `npx skills` with find-skills to browse available skills
- **Remove skill** — select skills to remove from your stack
- **Restore defaults** — reset to the 10 default skills
- **Save and return** — persist to `~/.create-allthing/skills-stack.json`

### Apply Skills to Existing Project

```bash
create-allthing skills          # interactive — detects duplicates, asks what to do
create-allthing skills -l       # list your current skill stack
create-allthing skills --stack-info  # show skills installed in current project
```

---

## Generated Structure

```
my-project/
├── frontend/            # React (Vite) or Angular
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── backend/             # FastAPI or .NET WebAPI
│   ├── src/
│   ├── Dockerfile
│   └── .dockerignore
├── infra/
│   ├── scripts/
│   └── db/
│       ├── migrations/
│       └── seeds/
├── mcp/
├── docs/
│   ├── specs/
│   └── agents.md
├── .claude/
│   ├── skills/
│   └── skills-lock.json
├── docker-compose.yml
├── Jenkinsfile          # if selected
├── .env.example
├── .env
├── .gitignore
├── my-project.code-workspace
└── README.md
```

---

## Quick Start (generated project)

```bash
cp .env.example .env
# edit .env with your values
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |

---

## Adding New Stack Options

The CLI uses a **registry pattern** — to add a new backend, frontend, or database:

1. Create the template folder in `templates/backend/<id>/` (or `frontend/<id>/`)
2. Add the entry to the corresponding registry in `src/registry/`
3. Create a runner in `src/runners/<id>.js` if it needs specific setup logic

Prompts, scaffold, and generators read from the registry automatically.

### Example: adding Express as a backend

```js
// src/registry/backends.js
export const backends = [
  // ... existing ...
  {
    id: 'express',
    label: 'Node.js + Express',
    dirs: ['src/routes', 'src/services', 'src/models', 'src/middleware', 'tests'],
    healthcheck: {
      compose: "['CMD', 'curl', '-sf', 'http://localhost:8080/health']",
    },
    readmeTest: 'cd backend && npm test',
  }
]
```

```
templates/backend/express/
├── Dockerfile
├── src/
│   └── index.js
└── .dockerignore
```

---

## Requirements

- **Node.js >= 18**
- **npm** (for React/Vite and Angular frontends)
- **uv** (for FastAPI — auto-installed if missing)
- **.NET SDK 8** (for .NET WebAPI)
- **Docker** (to run the generated project)
- **Git** (for the initial commit)

All runners degrade gracefully: if a tool is unavailable, they create the folder structure manually and show the installation command.

---

## Local Development

```bash
git clone https://github.com/Alberto02003/create-allthing
cd create-allthing
npm install
node bin/create-allthing.js
```

To test without publishing:

```bash
npm link
create-allthing
```

---

## Landing Page

The project has a companion landing page that showcases all features and available stacks:

- **Repository**: [create-allthing-landing](https://github.com/Alberto02003/create-allthing-landing)
- Static site (HTML + CSS + vanilla JS), bilingual (ES/EN), zero dependencies

When adding new stacks or features to the CLI, update the landing page to keep it in sync (see `index.html` and `js/i18n.js`).

---

## Roadmap

See [`docs/roadmap.md`](docs/roadmap.md) for planned improvements and feature proposals.

---

## License

MIT

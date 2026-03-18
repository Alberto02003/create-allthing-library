/**
 * Backend registry.
 *
 * Each entry:
 *   id               – internal identifier
 *   label            – human-readable name shown in prompts
 *   dirs             – subdirectories to create inside backend/
 *   healthcheck      – healthcheck snippets for Docker Compose and/or Dockerfile
 *     .compose       – array expression used in docker-compose.yml test field
 *     .dockerfile    – CMD string used in Dockerfile HEALTHCHECK (null = already baked into template)
 *   readmeTest       – command shown in README "running tests" section
 *   dotnetEntrypoint – entrypoint dll name for .NET (null for other backends)
 *
 * To add a new backend:
 *   1. Add a template directory under  templates/backend/<id>/
 *   2. Add a runner in                 src/runners/<id>.js  (or extend runners/uv.js etc.)
 *   3. Register it here.
 */
export const backends = [
  {
    id: 'fastapi',
    label: 'Python + FastAPI',
    dirs: ['src/routes', 'src/services', 'src/models', 'src/schemas', 'src/middleware', 'tests'],
    healthcheck: {
      compose:
        "['CMD','python','-c','import urllib.request; urllib.request.urlopen(\\'http://localhost:8080/health\\')']",
      dockerfile: null, // already defined in the Dockerfile template
    },
    readmeTest: 'cd backend && uv run pytest',
    dotnetEntrypoint: null,
  },
  {
    id: 'dotnet',
    label: '.NET WebAPI',
    dirs: ['Controllers', 'Services', 'Models', 'DTOs', 'Middleware', 'tests'],
    healthcheck: {
      compose: "['CMD','curl','-sf','http://localhost:8080/health']",
      dockerfile: 'curl -sf http://localhost:8080/health || exit 1', // already in template, kept for reference
    },
    readmeTest: 'cd backend && dotnet test',
    dotnetEntrypoint: 'backend.dll',
  },
];

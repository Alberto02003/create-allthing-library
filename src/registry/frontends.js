/**
 * Frontend registry.
 *
 * Each entry:
 *   id             – internal identifier used by scaffold / generators
 *   label          – human-readable name shown in prompts
 *   runner         – which runner module to invoke ('npm' | 'angular')
 *   buildArg       – Docker build arg for API URL (null if not needed)
 *   templateDir    – subdirectory under templates/frontend/
 *   readmeDev      – development commands shown in README
 *   workspaceLabel – display name for the VS Code workspace folder
 *
 * To add a new frontend:
 *   1. Add a template directory under  templates/frontend/<id>/
 *   2. Add a runner in                 src/runners/<runner>.js
 *   3. Register it here.
 */
export const frontends = [
  {
    id: 'react-vite',
    label: 'React (Vite)',
    runner: 'npm',
    buildArg: 'VITE_API_URL',
    templateDir: 'react-vite',
    readmeDev: 'cd frontend\nnpm install\nnpm run dev     # http://localhost:5173',
    workspaceLabel: 'Frontend (React + Vite)',
  },
  {
    id: 'angular',
    label: 'Angular',
    runner: 'angular',
    buildArg: null,
    templateDir: 'angular',
    readmeDev: 'cd frontend\nnpm install\nng serve        # http://localhost:4200',
    workspaceLabel: 'Frontend (Angular)',
  },
];

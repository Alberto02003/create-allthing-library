import { backends } from '../registry/backends.js';

/**
 * Generate a VS Code `.code-workspace` file.
 *
 * The workspace opens the root plus dedicated folders for frontend and backend,
 * and configures sensible per-folder settings and extensions.
 *
 * @param {{ projectName: string, backend: string }} options
 * @returns {string}  JSON string
 */
export function generateWorkspace({ projectName, backend }) {
  const backendMeta = backends.find((b) => b.id === backend);

  // ── Folder entries ────────────────────────────────────────────────────────
  const folders = [
    { path: '.', name: `${projectName} (root)` },
    { path: 'frontend', name: 'Frontend (React + Vite)' },
    { path: 'backend', name: `Backend (${backendMeta?.label ?? backend})` },
  ];

  // ── Per-folder settings ───────────────────────────────────────────────────
  const rootSettings = {
    'editor.formatOnSave': true,
    'editor.rulers': [100],
    'files.trimTrailingWhitespace': true,
    'files.insertFinalNewline': true,
  };

  const frontendSettings = {
    'editor.defaultFormatter': 'esbenp.prettier-vscode',
    'editor.formatOnSave': true,
    'typescript.tsdk': 'frontend/node_modules/typescript/lib',
    '[javascript]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
    '[javascriptreact]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
    '[typescript]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
    '[typescriptreact]': { 'editor.defaultFormatter': 'esbenp.prettier-vscode' },
  };

  let backendSettings = {};
  if (backend === 'fastapi') {
    backendSettings = {
      'python.defaultInterpreterPath': './backend/.venv/bin/python',
      'python.terminal.activateEnvironment': true,
      '[python]': { 'editor.defaultFormatter': 'charliermarsh.ruff' },
      'editor.formatOnSave': true,
    };
  } else if (backend === 'dotnet') {
    backendSettings = {
      '[csharp]': { 'editor.defaultFormatter': 'ms-dotnettools.csharp' },
      'editor.formatOnSave': true,
    };
  }

  // ── Recommended extensions ────────────────────────────────────────────────
  const commonExtensions = [
    'editorconfig.editorconfig',
    'streetsidesoftware.code-spell-checker',
    'eamodio.gitlens',
    'github.copilot',
  ];

  const frontendExtensions = [
    'esbenp.prettier-vscode',
    'dbaeumer.vscode-eslint',
    'dsznajder.es7-react-js-snippets',
  ];

  const dotnetExtensions = [
    'ms-dotnettools.csdevkit',
    'ms-dotnettools.csharp',
  ];

  const pythonExtensions = [
    'ms-python.python',
    'ms-python.vscode-pylance',
    'charliermarsh.ruff',
  ];

  const dockerExtensions = ['ms-azuretools.vscode-docker'];

  const backendExtensions = backend === 'dotnet' ? dotnetExtensions : pythonExtensions;

  const allExtensions = [
    ...commonExtensions,
    ...frontendExtensions,
    ...backendExtensions,
    ...dockerExtensions,
  ];

  // ── Assemble workspace object ─────────────────────────────────────────────
  const workspace = {
    folders,
    settings: rootSettings,
    'settings.frontend': frontendSettings,
    'settings.backend': backendSettings,
    extensions: {
      recommendations: allExtensions,
    },
    launch: {
      version: '0.2.0',
      configurations:
        backend === 'fastapi'
          ? [
              {
                name: 'FastAPI: Debug',
                type: 'python',
                request: 'launch',
                module: 'uvicorn',
                args: ['src.main:app', '--reload', '--port', '8080'],
                cwd: '${workspaceFolder}/backend',
                envFile: '${workspaceFolder}/.env',
                justMyCode: true,
              },
            ]
          : backend === 'dotnet'
          ? [
              {
                name: '.NET: Launch',
                type: 'coreclr',
                request: 'launch',
                preLaunchTask: 'build',
                program: '${workspaceFolder}/backend/bin/Debug/net8.0/backend.dll',
                args: [],
                cwd: '${workspaceFolder}/backend',
                stopAtEntry: false,
                env: { ASPNETCORE_ENVIRONMENT: 'Development', ASPNETCORE_URLS: 'http://localhost:8080' },
              },
            ]
          : [],
    },
  };

  return JSON.stringify(workspace, null, 2) + '\n';
}

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isWindows = process.platform === 'win32';

/**
 * Check whether `uv` is available on PATH.
 * Returns the resolved path or null.
 */
async function findUv() {
  try {
    const cmd = isWindows ? 'where' : 'which';
    const result = await execa(cmd, ['uv'], { stdio: 'pipe' });
    return result.stdout.trim().split('\n')[0].trim();
  } catch {
    return null;
  }
}

/**
 * Install uv using the official installer.
 * On Windows: PowerShell irm | iex
 * On Unix:    curl | sh
 */
async function installUv(spinner) {
  spinner.text = 'Installing uv (Python package manager)...';

  if (isWindows) {
    await execa(
      'powershell',
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        'irm https://astral.sh/uv/install.ps1 | iex',
      ],
      { stdio: 'pipe' },
    );
  } else {
    await execa(
      'sh',
      ['-c', 'curl -LsSf https://astral.sh/uv/install.sh | sh'],
      { stdio: 'pipe', shell: false },
    );
  }
}

/**
 * Refresh PATH so that the freshly installed `uv` is found.
 * On Windows: uv is typically installed to %USERPROFILE%\.local\bin or %USERPROFILE%\.cargo\bin
 * On Unix:    ~/.local/bin
 */
function refreshPath() {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? '';
  if (isWindows) {
    const extra = [
      path.join(home, '.local', 'bin'),
      path.join(home, '.cargo', 'bin'),
    ];
    process.env.PATH = [...extra, process.env.PATH].join(path.delimiter);
  } else {
    const extra = path.join(home, '.local', 'bin');
    process.env.PATH = [extra, process.env.PATH].join(':');
  }
}

/**
 * Run `uv init backend` then `uv add fastapi "uvicorn[standard]"` inside projectRoot.
 */
export async function runUv(projectRoot) {
  const spinner = ora({ text: 'Checking for uv...', color: 'yellow' }).start();

  let uvPath = await findUv();

  if (!uvPath) {
    spinner.warn('uv not found — attempting to install automatically...');

    try {
      await installUv(spinner);
      refreshPath();
      uvPath = await findUv();

      if (!uvPath) {
        throw new Error('uv was installed but could not be found on PATH after refresh.');
      }
      spinner.succeed(chalk.green('uv installed successfully'));
    } catch (err) {
      spinner.fail(chalk.red('Failed to install uv'));
      throw new Error(
        `uv is required but could not be installed automatically.\n` +
        `Please install it manually: https://docs.astral.sh/uv/getting-started/installation/\n` +
        `Original error: ${err.message}`,
      );
    }
  } else {
    spinner.succeed(chalk.green(`uv found (${uvPath})`));
  }

  // ── uv init ──────────────────────────────────────────────────────────────
  const initSpinner = ora({ text: 'Initialising Python project with uv...', color: 'yellow' }).start();
  try {
    await execa('uv', ['init', 'backend'], {
      cwd: projectRoot,
      stdio: 'pipe',
      env: { ...process.env },
    });
    initSpinner.succeed(chalk.green('uv init backend'));
  } catch (err) {
    initSpinner.fail('uv init failed');
    throw err;
  }

  // ── uv add dependencies ───────────────────────────────────────────────────
  const addSpinner = ora({ text: 'Adding FastAPI + uvicorn...', color: 'yellow' }).start();
  const backendDir = path.join(projectRoot, 'backend');

  try {
    await execa('uv', ['add', 'fastapi', 'uvicorn[standard]'], {
      cwd: backendDir,
      stdio: 'pipe',
      env: { ...process.env },
    });
    addSpinner.succeed(chalk.green('FastAPI + uvicorn added'));
  } catch (err) {
    addSpinner.fail('uv add failed');
    throw err;
  }

  // ── Write src/main.py ─────────────────────────────────────────────────────
  // The Dockerfile template also references src/main.py; ensure the file exists
  // even if `uv init` created a flat hello.py layout.
  const srcDir = path.join(backendDir, 'src');
  await fs.ensureDir(srcDir);

  const mainPyDest = path.join(srcDir, 'main.py');
  if (!(await fs.pathExists(mainPyDest))) {
    // Copy from templates (runners/ -> src/ -> project root -> templates/)
    const resolvedSrc = path.resolve(
      __dirname,
      '..',
      '..',
      'templates',
      'backend',
      'fastapi',
      'src',
      'main.py',
    );

    if (await fs.pathExists(resolvedSrc)) {
      await fs.copy(resolvedSrc, mainPyDest);
    } else {
      // Inline fallback
      await fs.writeFile(
        mainPyDest,
        `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Backend API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/")
def root():
    return {"message": "Backend API running"}
`,
        'utf-8',
      );
    }
  }

  // Ensure src/__init__.py exists
  await fs.ensureFile(path.join(srcDir, '__init__.py'));
}

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

/**
 * Scaffold the frontend using `npm create vite@latest`.
 * Falls back to creating a minimal directory structure if npm / npx is not available.
 */
export async function runNpm(projectRoot) {
  const spinner = ora({ text: 'Creating React + Vite app...', color: 'yellow' }).start();

  try {
    // npm create vite@latest places the scaffold into a child dir named "frontend"
    await execa(
      'npm',
      ['create', 'vite@latest', 'frontend', '--', '--template', 'react'],
      {
        cwd: projectRoot,
        stdio: 'pipe',
        // Accept any version of create-vite by auto-confirming prompts
        env: { ...process.env, npm_config_yes: 'true' },
      },
    );

    spinner.succeed(chalk.green('React + Vite app created'));
  } catch (err) {
    spinner.warn(chalk.yellow('npm create vite failed — creating minimal frontend structure'));

    // Graceful fallback: create the directories manually so the rest of the
    // scaffold can continue without npm being available.
    const frontendDir = path.join(projectRoot, 'frontend');
    await fs.ensureDir(path.join(frontendDir, 'src'));
    await fs.ensureDir(path.join(frontendDir, 'public'));

    // Minimal package.json
    await fs.writeJson(
      path.join(frontendDir, 'package.json'),
      {
        name: 'frontend',
        version: '0.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview',
        },
        dependencies: { react: '^18.3.1', 'react-dom': '^18.3.1' },
        devDependencies: {
          '@types/react': '^18.3.1',
          '@types/react-dom': '^18.3.1',
          '@vitejs/plugin-react': '^4.3.1',
          vite: '^5.4.2',
        },
      },
      { spaces: 2 },
    );

    // Minimal vite.config.js
    await fs.writeFile(
      path.join(frontendDir, 'vite.config.js'),
      `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\n\nexport default defineConfig({\n  plugins: [react()],\n  server: { port: 3000 },\n})\n`,
      'utf-8',
    );

    // Minimal index.html
    await fs.writeFile(
      path.join(frontendDir, 'index.html'),
      `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>App</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n`,
      'utf-8',
    );

    // Minimal src/main.jsx
    await fs.writeFile(
      path.join(frontendDir, 'src', 'main.jsx'),
      `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App.jsx'\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>,\n)\n`,
      'utf-8',
    );

    // Minimal src/App.jsx
    await fs.writeFile(
      path.join(frontendDir, 'src', 'App.jsx'),
      `export default function App() {\n  return (\n    <div>\n      <h1>Hello from create-allthing</h1>\n      <p>Edit <code>src/App.jsx</code> to get started.</p>\n    </div>\n  )\n}\n`,
      'utf-8',
    );

    console.log(chalk.gray('     Run `npm install` inside the frontend/ directory when ready.'));
  }
}

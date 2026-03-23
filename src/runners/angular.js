import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

/**
 * Scaffold the frontend using `@angular/cli`.
 * Falls back to creating a minimal directory structure if npx / ng is not available.
 */
export async function runAngular(projectRoot) {
  const spinner = ora({ text: 'Creating Angular app...', color: 'yellow' }).start();

  const frontendDir = path.join(projectRoot, 'frontend');

  try {
    await execa(
      'npx',
      [
        '@angular/cli', 'new', 'frontend',
        '--directory', 'frontend',
        '--skip-git',
        '--style', 'css',
        '--routing',
        '--ssr', 'false',
      ],
      {
        cwd: projectRoot,
        stdio: 'pipe',
        env: { ...process.env, npm_config_yes: 'true' },
        timeout: 120_000,
      },
    );

    spinner.succeed(chalk.green('Angular app created'));
  } catch (err) {
    spinner.warn(chalk.yellow('Angular CLI failed — creating minimal Angular structure'));

    await fs.ensureDir(path.join(frontendDir, 'src', 'app'));
    await fs.ensureDir(path.join(frontendDir, 'src', 'environments'));

    // Minimal package.json
    await fs.writeJson(
      path.join(frontendDir, 'package.json'),
      {
        name: 'frontend',
        version: '0.0.0',
        scripts: {
          ng: 'ng',
          start: 'ng serve',
          build: 'ng build',
          test: 'ng test',
        },
        dependencies: {
          '@angular/animations': '^18.0.0',
          '@angular/common': '^18.0.0',
          '@angular/compiler': '^18.0.0',
          '@angular/core': '^18.0.0',
          '@angular/forms': '^18.0.0',
          '@angular/platform-browser': '^18.0.0',
          '@angular/platform-browser-dynamic': '^18.0.0',
          '@angular/router': '^18.0.0',
          rxjs: '~7.8.0',
          tslib: '^2.6.0',
          'zone.js': '~0.14.0',
        },
        devDependencies: {
          '@angular/cli': '^18.0.0',
          '@angular/compiler-cli': '^18.0.0',
          typescript: '~5.4.0',
        },
      },
      { spaces: 2 },
    );

    // Minimal angular.json
    await fs.writeJson(
      path.join(frontendDir, 'angular.json'),
      {
        $schema: './node_modules/@angular/cli/lib/config/schema.json',
        version: 1,
        newProjectRoot: 'projects',
        projects: {
          frontend: {
            projectType: 'application',
            root: '',
            sourceRoot: 'src',
            architect: {
              build: {
                builder: '@angular-devkit/build-angular:application',
                options: {
                  outputPath: 'dist/frontend',
                  index: 'src/index.html',
                  browser: 'src/main.ts',
                  tsConfig: 'tsconfig.json',
                },
                configurations: {
                  production: { budgets: [], outputHashing: 'all' },
                  development: { optimization: false, extractLicenses: false, sourceMap: true },
                },
                defaultConfiguration: 'production',
              },
              serve: {
                builder: '@angular-devkit/build-angular:dev-server',
                configurations: {
                  production: { buildTarget: 'frontend:build:production' },
                  development: { buildTarget: 'frontend:build:development' },
                },
                defaultConfiguration: 'development',
              },
            },
          },
        },
      },
      { spaces: 2 },
    );

    // Minimal tsconfig.json
    await fs.writeJson(
      path.join(frontendDir, 'tsconfig.json'),
      {
        compileOnSave: false,
        compilerOptions: {
          outDir: './dist/out-tsc',
          strict: true,
          sourceMap: true,
          declaration: false,
          downlevelIteration: true,
          experimentalDecorators: true,
          moduleResolution: 'node',
          importHelpers: true,
          target: 'ES2022',
          module: 'ES2022',
          lib: ['ES2022', 'dom'],
        },
      },
      { spaces: 2 },
    );

    // index.html
    await fs.writeFile(
      path.join(frontendDir, 'src', 'index.html'),
      `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>App</title>
    <base href="/" />
  </head>
  <body>
    <app-root></app-root>
  </body>
</html>
`,
      'utf-8',
    );

    // main.ts
    await fs.writeFile(
      path.join(frontendDir, 'src', 'main.ts'),
      `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch((err) => console.error(err));
`,
      'utf-8',
    );

    // app.component.ts
    await fs.writeFile(
      path.join(frontendDir, 'src', 'app', 'app.component.ts'),
      `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`
    <div>
      <h1>Hello from create-allthing</h1>
      <p>Edit <code>src/app/app.component.ts</code> to get started.</p>
    </div>
  \`,
})
export class AppComponent {}
`,
      'utf-8',
    );

    // environment.ts
    await fs.writeFile(
      path.join(frontendDir, 'src', 'environments', 'environment.ts'),
      `export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080',
};
`,
      'utf-8',
    );

    // environment.production.ts
    await fs.writeFile(
      path.join(frontendDir, 'src', 'environments', 'environment.production.ts'),
      `export const environment = {
  production: true,
  apiUrl: '/api',
};
`,
      'utf-8',
    );

    console.log(chalk.gray('     Run `npm install` inside the frontend/ directory when ready.'));
  }
}

import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';
import ora from 'ora';
import { execa } from 'execa';

const isWindows = process.platform === 'win32';

/**
 * Check whether `dotnet` CLI is available.
 */
async function findDotnet() {
  try {
    const cmd = isWindows ? 'where' : 'which';
    const result = await execa(cmd, ['dotnet'], { stdio: 'pipe' });
    return result.stdout.trim().split('\n')[0].trim();
  } catch {
    return null;
  }
}

/**
 * Patch Program.cs to add a /health endpoint and configure Kestrel on port 8080.
 */
async function patchProgramCs(backendDir) {
  const programCsPath = path.join(backendDir, 'Program.cs');

  const content = `var builder = WebApplication.CreateBuilder(args);

// Configure Kestrel to listen on 8080 (Docker-friendly)
builder.WebHost.UseUrls("http://0.0.0.0:8080");

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/", () => Results.Ok(new { message = "Backend API running" }));

app.Run();
`;

  await fs.writeFile(programCsPath, content, 'utf-8');
}

/**
 * Patch the .csproj file to target net8.0.
 */
async function patchCsproj(backendDir) {
  const files = await fs.readdir(backendDir);
  const csprojFile = files.find((f) => f.endsWith('.csproj'));

  if (!csprojFile) return;

  const csprojPath = path.join(backendDir, csprojFile);
  let content = await fs.readFile(csprojPath, 'utf-8');

  // Replace whatever target framework was generated with net8.0
  content = content.replace(/<TargetFramework>.*?<\/TargetFramework>/, '<TargetFramework>net8.0</TargetFramework>');

  // Ensure the project produces an executable
  if (!content.includes('<OutputType>')) {
    content = content.replace(
      '<PropertyGroup>',
      '<PropertyGroup>\n    <OutputType>Exe</OutputType>',
    );
  }

  await fs.writeFile(csprojPath, content, 'utf-8');

  // Also rename the output dll to match what the Dockerfile expects (backend.dll)
  // This is handled by adding an AssemblyName if not already named "backend"
  if (!content.includes('<AssemblyName>')) {
    content = content.replace(
      '</PropertyGroup>',
      '  <AssemblyName>backend</AssemblyName>\n  </PropertyGroup>',
    );
    await fs.writeFile(csprojPath, content, 'utf-8');
  }
}

/**
 * Run `dotnet new webapi -o backend --no-openapi` inside projectRoot,
 * then patch Program.cs and .csproj.
 */
export async function runDotnet(projectRoot) {
  const spinner = ora({ text: 'Checking for dotnet CLI...', color: 'yellow' }).start();

  const dotnetPath = await findDotnet();

  if (!dotnetPath) {
    spinner.fail(chalk.red('dotnet CLI not found'));
    throw new Error(
      'dotnet CLI is required to scaffold a .NET WebAPI project.\n' +
      'Install it from: https://dotnet.microsoft.com/download',
    );
  }

  spinner.succeed(chalk.green(`dotnet found (${dotnetPath})`));

  // ── dotnet new webapi ─────────────────────────────────────────────────────
  const newSpinner = ora({ text: 'Creating .NET WebAPI project...', color: 'yellow' }).start();

  try {
    await execa('dotnet', ['new', 'webapi', '-o', 'backend', '--no-openapi'], {
      cwd: projectRoot,
      stdio: 'pipe',
    });
    newSpinner.succeed(chalk.green('dotnet new webapi'));
  } catch (err) {
    // Some versions of dotnet do not support --no-openapi; retry without it
    try {
      await execa('dotnet', ['new', 'webapi', '-o', 'backend'], {
        cwd: projectRoot,
        stdio: 'pipe',
      });
      newSpinner.succeed(chalk.green('dotnet new webapi (with openapi)'));
    } catch (err2) {
      newSpinner.fail('dotnet new webapi failed');
      throw err2;
    }
  }

  const backendDir = path.join(projectRoot, 'backend');

  // ── Patch Program.cs ──────────────────────────────────────────────────────
  const patchSpinner = ora({ text: 'Patching Program.cs for /health endpoint...', color: 'yellow' }).start();
  try {
    await patchProgramCs(backendDir);
    patchSpinner.succeed(chalk.green('Program.cs patched'));
  } catch (err) {
    patchSpinner.warn(chalk.yellow(`Could not patch Program.cs: ${err.message}`));
  }

  // ── Patch .csproj ─────────────────────────────────────────────────────────
  const csprojSpinner = ora({ text: 'Patching .csproj (net8.0)...', color: 'yellow' }).start();
  try {
    await patchCsproj(backendDir);
    csprojSpinner.succeed(chalk.green('.csproj patched'));
  } catch (err) {
    csprojSpinner.warn(chalk.yellow(`Could not patch .csproj: ${err.message}`));
  }
}

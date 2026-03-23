import { frontends } from '../registry/frontends.js';
import { backends } from '../registry/backends.js';
import { databases } from '../registry/databases.js';

/**
 * Build the healthcheck block for a service.
 * Returns an indented YAML string (no trailing newline).
 */
function buildHealthcheck(test, interval = '30s', timeout = '5s', startPeriod = '10s', retries = 3) {
  return [
    `    healthcheck:`,
    `      test: ${test}`,
    `      interval: ${interval}`,
    `      timeout: ${timeout}`,
    `      start_period: ${startPeriod}`,
    `      retries: ${retries}`,
  ].join('\n');
}

/**
 * Generate the `docker-compose.yml` content as a string.
 *
 * @param {{ backend: string, database: string }} options
 * @returns {string}
 */
export function generateCompose({ frontend, backend, database }) {
  const frontendMeta = frontends.find((f) => f.id === frontend);
  const backendMeta = backends.find((b) => b.id === backend);
  const dbMeta = databases.find((d) => d.id === database);
  const hasDb = database !== 'none' && dbMeta != null;

  // ── Frontend service ──────────────────────────────────────────────────────
  const buildArgBlock = frontendMeta?.buildArg
    ? `\n      args:\n        ${frontendMeta.buildArg}: \${${frontendMeta.buildArg}:-http://localhost:8080}`
    : '';

  const frontendService = `  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile${buildArgBlock}
    ports:
      - "3000:8080"
    networks:
      - frontend-net
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/"]
      interval: 30s
      timeout: 5s
      start_period: 10s
      retries: 3`;

  // ── Backend service ───────────────────────────────────────────────────────
  const backendNetworks = hasDb
    ? `    networks:\n      - frontend-net\n      - backend-net`
    : `    networks:\n      - frontend-net`;

  const backendHealthTest = backendMeta?.healthcheck?.compose ?? "['CMD','curl','-sf','http://localhost:8080/health']";

  const backendHealthStartPeriod = backend === 'dotnet' ? '20s' : backend === 'fastapi' ? '15s' : '10s';

  const backendDepends = hasDb
    ? `    depends_on:\n      db:\n        condition: service_healthy`
    : '';

  let backendEnvBlock = '';
  if (hasDb) {
    if (database === 'postgres') {
      backendEnvBlock = `    environment:
      DATABASE_URL: \${DATABASE_URL:-postgresql://\${POSTGRES_USER:-appuser}:\${POSTGRES_PASSWORD:-changeme}@db:5432/\${POSTGRES_DB:-appdb}}`;
    } else if (database === 'mongodb') {
      backendEnvBlock = `    environment:
      MONGODB_URL: \${MONGODB_URL:-mongodb://\${MONGO_INITDB_ROOT_USERNAME:-appuser}:\${MONGO_INITDB_ROOT_PASSWORD:-changeme}@db:27017/\${MONGO_INITDB_DATABASE:-appdb}?authSource=admin}`;
    }
  }

  const backendService = `  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
${backendNetworks}
${backendDepends ? backendDepends + '\n' : ''}${backendEnvBlock ? backendEnvBlock + '\n' : ''}    restart: unless-stopped
    healthcheck:
      test: ${backendHealthTest}
      interval: 30s
      timeout: 5s
      start_period: ${backendHealthStartPeriod}
      retries: 3`;

  // ── Database service ──────────────────────────────────────────────────────
  let dbService = '';

  if (hasDb && database === 'postgres') {
    dbService = `  db:
    image: ${dbMeta.image}
    environment:
      POSTGRES_USER: \${POSTGRES_USER:-appuser}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-changeme}
      POSTGRES_DB: \${POSTGRES_DB:-appdb}
    ports:
      - "${dbMeta.port}:5432"
    volumes:
      - db-data:/var/lib/postgresql/data
    networks:
      - backend-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $\{POSTGRES_USER:-appuser} -d $\{POSTGRES_DB:-appdb}"]
      interval: 10s
      timeout: 5s
      start_period: 10s
      retries: 5`;
  } else if (hasDb && database === 'mongodb') {
    dbService = `  db:
    image: ${dbMeta.image}
    environment:
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_INITDB_ROOT_USERNAME:-appuser}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_INITDB_ROOT_PASSWORD:-changeme}
      MONGO_INITDB_DATABASE: \${MONGO_INITDB_DATABASE:-appdb}
    ports:
      - "${dbMeta.port}:27017"
    volumes:
      - db-data:/data/db
    networks:
      - backend-net
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      start_period: 15s
      retries: 5`;
  }

  // ── Networks & Volumes ────────────────────────────────────────────────────
  const networksBlock = hasDb
    ? `networks:\n  frontend-net:\n    driver: bridge\n  backend-net:\n    driver: bridge`
    : `networks:\n  frontend-net:\n    driver: bridge`;

  const volumesBlock = hasDb ? `\nvolumes:\n  db-data:` : '';

  // ── Assemble ──────────────────────────────────────────────────────────────
  const services = [frontendService, backendService, dbService].filter(Boolean).join('\n\n');

  return [
    `# Generated by create-allthing`,
    `# Edit freely — this file is yours.`,
    ``,
    `services:`,
    services,
    ``,
    networksBlock,
    volumesBlock,
    ``,
  ].join('\n');
}

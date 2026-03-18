/**
 * Database registry.
 *
 * Each entry:
 *   id     – internal identifier ('none' means no database)
 *   label  – human-readable name shown in prompts
 *   port   – host port exposed by the container (undefined for 'none')
 *   image  – Docker image to use (undefined for 'none')
 *
 * To add a new database:
 *   1. Add healthcheck / env / compose logic in  src/generators/compose.js
 *   2. Add env vars in                           src/generators/env.js
 *   3. Register it here.
 */
export const databases = [
  {
    id: 'none',
    label: 'Ninguna',
  },
  {
    id: 'postgres',
    label: 'PostgreSQL',
    port: 5432,
    image: 'postgres:15-alpine',
  },
  {
    id: 'mongodb',
    label: 'MongoDB',
    port: 27017,
    image: 'mongo:7',
  },
];

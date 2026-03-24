# Roadmap

Propuestas de mejora para create-allthing, organizadas por impacto.

---

## Alto impacto

### 1. Docker Compose para desarrollo con hot-reload

**Problema**: El compose actual genera builds de produccion. Cada cambio de codigo requiere rebuild completo de la imagen.

**Propuesta**: Generar un `docker-compose.override.yml` (o perfil `dev`) con bind mounts para hot-reload:

- `./frontend/src:/app/src` para el frontend
- `./backend:/app` para el backend
- Modo watch de Vite/Angular y recarga de uvicorn/dotnet watch

**Archivos afectados**: `src/generators/compose.js`, `src/scaffold.js`

---

### 2. Conexion backend ↔ base de datos

**Problema**: El compose inyecta `DATABASE_URL` / `MONGODB_URL` como variable de entorno, pero los templates de backend no las leen. No se instala ningun driver (sqlalchemy, motor, Npgsql, EF Core).

**Propuesta**:
- FastAPI + PostgreSQL: anadir `sqlalchemy` y `asyncpg` como dependencias, crear `src/database.py` con connection pool
- FastAPI + MongoDB: anadir `motor`, crear `src/database.py` con cliente async
- .NET + PostgreSQL: anadir `Npgsql.EntityFrameworkCore.PostgreSQL`, configurar DbContext
- .NET + MongoDB: anadir `MongoDB.Driver`, configurar MongoClient

**Archivos afectados**: `src/runners/uv.js`, `src/runners/dotnet.js`, nuevos templates en `templates/backend/`

---

### 3. Nginx como reverse proxy de API

**Problema**: El frontend necesita conocer la URL del backend en build time (`VITE_API_URL`). Angular no tiene ningun mecanismo. Esto obliga a CORS y a configuracion fragil.

**Propuesta**: Anadir un bloque `location /api/` en `nginx.conf` que haga proxy_pass al backend. Esto elimina la necesidad de CORS y de inyectar URLs en build time.

```nginx
location /api/ {
    proxy_pass http://backend:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

**Archivos afectados**: `templates/frontend/react-vite/nginx.conf`, `templates/frontend/angular/nginx.conf`, `src/generators/compose.js` (ajustar networks)

---

## Impacto medio

### 4. Herramientas de admin de base de datos

**Propuesta**: Anadir servicios opcionales al compose usando `profiles: [tools]`:
- PostgreSQL → pgAdmin o Adminer
- MongoDB → Mongo Express

Se activarian con `docker compose --profile tools up`.

**Archivos afectados**: `src/generators/compose.js`, `src/generators/env.js`

---

### 5. Tests funcionales de caja

**Problema**: Se crea `tests/` con `.gitkeep` pero ningun test. `uv run pytest` y `dotnet test` no encuentran nada.

**Propuesta**:
- FastAPI: crear `tests/conftest.py` con `TestClient` fixture y `tests/test_health.py`
- .NET: crear proyecto de test con xUnit y test del endpoint `/health`

**Archivos afectados**: Nuevos templates en `templates/backend/fastapi/tests/` y `templates/backend/dotnet/tests/`

---

### 6. Mover logica de base de datos al registry

**Problema**: `compose.js` y `env.js` tienen bloques `if (database === 'postgres') ... else if (database === 'mongodb')` hardcodeados. Anadir MySQL o Redis requiere editar los generators.

**Propuesta**: Mover snippets de YAML, variables de entorno, healthchecks y volumenes a `databases.js` como campos del registry. Los generators leen del registry sin necesidad de `if/else`.

```js
// src/registry/databases.js
{
  id: 'postgres',
  image: 'postgres:15-alpine',
  envVars: { POSTGRES_USER: '...', POSTGRES_PASSWORD: '...', POSTGRES_DB: '...' },
  composeSnippet: '...', // o un objeto que se serialice a YAML
  healthcheck: "['CMD-SHELL', 'pg_isready -U ...']",
  volume: 'db-data:/var/lib/postgresql/data',
}
```

**Archivos afectados**: `src/registry/databases.js`, `src/generators/compose.js`, `src/generators/env.js`

---

### 7. `agents.md` dinamico

**Problema**: El archivo `docs/agents.md` esta hardcodeado y siempre dice "React + Vite SPA" aunque se elija Angular. Referencia comandos que no existen.

**Propuesta**: Generarlo dinamicamente en `src/scaffold.js` segun el stack seleccionado, similar a como se genera el README.

**Archivos afectados**: `src/scaffold.js` (o nuevo `src/generators/agents.js`)

---

## Impacto menor

### 8. Nuevos stacks

El registry pattern hace facil anadir:
- **Frontend**: Vue (Vite), SvelteKit, Next.js
- **Backend**: Express/NestJS, Spring Boot, Go (Fiber/Gin)
- **Infra**: Redis (como cache/session store)

Cada uno requiere: entry en registry, templates (Dockerfile + codigo base), y runner.

---

### 9. Test frontend + lint en Jenkinsfile

**Problema**: El Jenkinsfile tiene `Test Backend` pero no `Test Frontend` ni etapa de lint.

**Propuesta**: Anadir stages de `Lint` y `Test Frontend` usando los comandos del registry (`readmeDev`, `readmeTest`).

**Archivos afectados**: `src/generators/jenkinsfile.js`

---

### 10. `.editorconfig`

**Problema**: El workspace recomienda la extension `editorconfig.editorconfig` pero no genera el archivo.

**Propuesta**: Generar `.editorconfig` en el root del proyecto con indent style/size consistente.

**Archivos afectados**: `src/scaffold.js`

---

### 11. Scripts en `infra/scripts/`

**Problema**: Se crea el directorio vacio.

**Propuesta**: Generar scripts utiles como `wait-for-it.sh` (esperar a que la DB este lista) o `seed.sh` (ejecutar seeds).

**Archivos afectados**: Nuevos templates, `src/scaffold.js`

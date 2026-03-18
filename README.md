# create-allthing

CLI para generar proyectos full-stack con estructura estandarizada, Docker incluido y listo para agentes de IA.

```bash
npx create-allthing
```

---

## Características

- Scaffolding interactivo guiado por prompts
- Docker multi-stage optimizado para cada tecnología
- Healthchecks configurados en Dockerfile y docker-compose
- Aislamiento de red: frontend-net / backend-net
- Variables de entorno inyectadas correctamente en build time (Vite)
- Nginx con SPA routing (`try_files`) listo para React Router
- Estructura predecible pensada para agentes de IA (Claude Code, Cursor, Codex)
- Skills de Claude Code preinstaladas
- Repo git inicializado con commit inicial

---

## Stacks disponibles

| Capa | Opciones |
|---|---|
| Frontend | React (Vite) |
| Backend | Python + FastAPI · .NET WebAPI |
| Base de datos | PostgreSQL · MongoDB · Ninguna |

---

## Uso

```bash
npx create-allthing
```

El CLI hace las siguientes preguntas:

1. **Nombre del proyecto** — se usa como nombre de carpeta y workspace
2. **Frontend** — selección de la lista de opciones registradas
3. **Backend** — selección de la lista de opciones registradas
4. **Base de datos** — selección de la lista de opciones registradas
5. **Confirmación** — resumen antes de crear nada

Una vez confirmado, el CLI:

- Crea la estructura de carpetas
- Ejecuta `npm create vite` / `uv init` / `dotnet new webapi` según la selección
- Genera `docker-compose.yml`, `.env.example`, `.gitignore`, `README.md`, `.code-workspace`
- Instala skills de Claude Code
- Hace `git init` con commit inicial

---

## Estructura generada

```
mi-proyecto/
├── frontend/            # React (Vite)
│   ├── src/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── .dockerignore
├── backend/             # FastAPI o .NET WebAPI
│   ├── src/
│   ├── Dockerfile
│   └── .dockerignore
├── bd/                  # Solo si se selecciona BD
│   ├── migrations/
│   ├── seeds/
│   └── init.sql / init.js
├── infra/scripts/
├── mcp/
├── docs/
│   └── agents.md
├── .claude/skills/
├── docker-compose.yml
├── .env.example
├── .env
├── .gitignore
├── skills-lock.json
├── mi-proyecto.code-workspace
└── README.md
```

---

## Arranque rápido del proyecto generado

```bash
cp .env.example .env
# edita .env con tus valores
docker compose up --build
```

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:8080 |

---

## Añadir nuevas opciones de stack

El CLI usa un **patrón registro** — para añadir un nuevo backend, frontend o base de datos solo hay que:

1. Crear la carpeta de templates en `templates/backend/<id>/` (o `frontend/` / `database/`)
2. Añadir la entrada al registro correspondiente en `src/registry/`
3. Crear el runner en `src/runners/<id>.js` si necesita lógica de instalación específica

No hay que tocar prompts, scaffold ni generadores — leen el registro automáticamente.

### Ejemplo: añadir Express como backend

```js
// src/registry/backends.js
export const backends = [
  // ... existentes ...
  {
    id: 'express',
    label: 'Node.js + Express',
    dirs: ['src/routes', 'src/services', 'src/models', 'src/middleware', 'tests'],
    healthcheck: {
      compose: "['CMD', 'curl', '-sf', 'http://localhost:8080/health']",
    },
    readmeTest: 'cd backend && npm test',
    runner: 'npm',   // usa el runner npm.js genérico
  }
]
```

```
templates/backend/express/
├── Dockerfile
├── src/
│   └── index.js
└── .dockerignore
```

---

## Requisitos

- **Node.js >= 18**
- **npm** (para el frontend React/Vite)
- **uv** (para FastAPI — se instala automáticamente si no está)
- **.NET SDK 8** (para .NET WebAPI)
- **Docker** (para ejecutar el proyecto generado)
- **Git** (para el commit inicial)

Todos los runners degradan gracefully: si la herramienta no está disponible, crean la estructura de carpetas manualmente y muestran el comando de instalación.

---

## Desarrollo local

```bash
git clone https://github.com/<tu-usuario>/create-allthing
cd create-allthing
npm install
node bin/create-allthing.js
```

Para probar sin publicar:

```bash
npm link
create-allthing
```

---

## Publicar en npm

```bash
npm login
npm publish
```

---

## Licencia

MIT

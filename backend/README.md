# API Task Manager (Node.js + Express + PostgreSQL + JWT)

API de práctica que implementa todo lo que el tutorial supone: registro, login, access token
corto + refresh token con **rotación y detección de reutilización**, logout, logout-all,
tareas con **aislamiento por dueño**, rate limit en login/refresh y límites de tamaño.

## Requisitos

- Node.js 20+ (probado con 22)
- PostgreSQL 14+ (probado con 16)
- k6 (opcional, sección 10)

## Preparar

```bash
cd backend
npm ci
createdb taskmanager_test        # BD SOLO para pruebas (el nombre debe terminar en _test)
createdb taskmanager_dev         # BD para correr la API a mano
```

Por defecto se usa `postgres://postgres@localhost:5432/taskmanager_test`. Cámbialo con
`DATABASE_URL`. `resetTestDatabase()` se niega a borrar una BD cuyo nombre no termine en `_test`.

## Pruebas

```bash
npm test               # todo (79 pruebas)
npm run test:unit      # solo unitarias (sin BD)
npm run test:smoke     # suite de humo (sección 13)
npm run test:coverage  # con cobertura
```

| Archivo | Sección / ejercicio |
|---|---|
| `test/unit/validation.test.js` | 4 – título en el máximo, id ausente |
| `test/unit/boundaries.test.js` | 8 – particiones y límites de título **y contraseña** |
| `test/unit/taskClient.mock.test.js` | 15 – cliente con mock |
| `test/integration/tasks.api.test.js` | 6 – id inválido, título ausente, actualizar tarea ajena; regresión BUG-TM-042 |
| `test/integration/security.test.js` | 9 – `ownerId`, inyección, XSS, tokens, refresh, logout(-all), rate limit |
| `test/integration/smoke.test.js` | 13 – humo |
| `test/integration/taskClient.integration.test.js` | 15 – mismo cliente contra la API real |

## Correr la API

```bash
DATABASE_URL=postgres://postgres@localhost:5432/taskmanager_dev npm start
curl -i http://localhost:3000/health
```

## Carga (sección 10) – solo contra tu entorno local

```bash
BASE_URL=http://localhost:3000 k6 run k6/health-test.js
BASE_URL=http://localhost:3000 P95_MS=1 k6 run k6/health-test.js   # umbral cambiado
BASE_URL=http://localhost:3000 k6 run k6/tasks-list-test.js
```

## Sesión exploratoria (sección 3)

`scripts/explore-session.sh` reproduce las pruebas de la sesión de `docs/03`.
Requiere la API corriendo en `localhost:3000`.

## Endpoints

| Método | Ruta | Auth |
|---|---|---|
| GET | `/health` | – |
| POST | `/api/v1/auth/register` `{email,password}` | – |
| POST | `/api/v1/auth/login` `{email,password}` | – (rate limit) |
| POST | `/api/v1/auth/refresh` `{refreshToken}` | – (rate limit) |
| POST | `/api/v1/auth/logout` `{refreshToken}` | – |
| POST | `/api/v1/auth/logout-all` | Bearer |
| GET | `/api/v1/tasks?limit=&offset=` | Bearer |
| POST | `/api/v1/tasks` `{title}` | Bearer |
| GET/PATCH/DELETE | `/api/v1/tasks/:id` | Bearer |

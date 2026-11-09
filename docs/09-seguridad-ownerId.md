# Ejercicio 9 – Comportamiento negativo y seguridad básica

Todo se ejecutó **solo** contra la API local y la BD `taskmanager_test`, con cuentas sintéticas.

## El ejercicio: actualizar una tarea enviando `ownerId`

**Prueba:** `backend/test/integration/security.test.js` › *ownerId cannot be set by the client*

| Paso | Petición | Resultado |
|---|---|---|
| 1 | Usuario A crea `Owner task` | 201 |
| 2 | A hace `PATCH /tasks/{id}` con `{"title":"Renamed","ownerId":"<id de B>","owner_id":"<id de B>"}` | **200**; el título cambia, `ownerId` se **ignora** |
| 3 | Se consulta la BD directamente | `owner_id` sigue siendo A ✅ |
| 4 | B intenta leer la tarea | **404** ✅ |
| 5 | A hace `POST` con `ownerId` de B ("plantar" una tarea a otro) | La tarea se crea para A; la lista de B sigue vacía ✅ |
| 6 | `PATCH` con **solo** `ownerId` | **400** *Nothing to update.* ✅ |

**Conclusión:** la propiedad se deriva del token en el servidor (`owner_id = req.user.id`) y
el `PATCH` usa una lista blanca (`title`, `completed`). Se eligió **ignorar** el campo; la alternativa
igualmente válida es rechazar con 400 cualquier campo desconocido.

## Resto de la sección 9 (pasos 1–6)

| Paso | Qué se probó | Resultado |
|---|---|---|
| 1. Tipos inválidos, campos ausentes, tamaño | `title` = número, array, objeto, null, bool → 400 · `completed: "yes"` → 400 · body de 20 KB → **413** sin stack · JSON roto → 400 · `limit=100000` → acotado a 100 | ✅ |
| 2. Texto con forma de inyección SQL | `' OR '1'='1` se guarda **literal**; no devuelve tareas de otros; la tabla no se altera. Id con forma SQL en la URL → 400 | ✅ (consultas parametrizadas `$1`) |
| 3. Marcado tipo HTML | `<script>alert(1)</script>` se devuelve igual, como JSON con `X-Content-Type-Options: nosniff`. En Flutter `Text()` nunca interpreta HTML | ✅ |
| 4. Control de acceso con token de B | Leer, actualizar y borrar tareas de A → 404, y A conserva la tarea | ✅ |
| 5. Rate limit (corrida pequeña autorizada) | Instancia con límite 3: intentos 1–3 → 401, el 4º → **429** *Too many attempts…* con cabecera `RateLimit` | ✅ |
| 6. Tokens | Token expirado → 401 · firma incorrecta → 401 · `alg: none` → 401 · **rotación** de refresh → par nuevo · **reutilización** del refresh viejo → 401 y revoca **toda la familia** · logout → revoca solo esa sesión · **logout-all** → revoca todos los refresh **y** los access tokens vigentes | ✅ |

Además: el login responde exactamente igual para "email no existe" y "contraseña incorrecta"
(sin enumeración de usuarios).

## Checklist OWASP API Top 10 aplicado al Task Manager

| Riesgo | Control en el código | Prueba |
|---|---|---|
| API1 BOLA | `WHERE id = $1 AND owner_id = $2` en todas las consultas | tasks.api › cross-user |
| API2 Autenticación rota | JWT HS256 con algoritmo fijado, `token_version`, refresh rotado | security › tokens |
| API3 Propiedad a nivel de objeto | Lista blanca de campos; DTO sin `owner_id` | security › ownerId |
| API4 Consumo de recursos | body ≤ 10 KB, `limit` ≤ 100 | security › oversized / page size |
| API5 Autorización a nivel de función | `requireAuth` en todo `/tasks` y `/logout-all` | tasks.api › 401 |
| API6 Flujos sensibles | rate limit en login y refresh | security › rate limiting |
| API7 SSRF | No se acepta ninguna URL del usuario | n/a (por diseño) |
| API8 Mala configuración | `helmet`, sin `x-powered-by`, errores 500 genéricos | security › markup/headers |
| API9 Inventario | Solo `/api/v1`; rutas desconocidas → 404 | — |
| API10 Consumo inseguro de APIs | El cliente valida la forma de la respuesta (`Task.fromJson`, `TaskClient`) | taskClient.mock › malformed body |

**Pendiente para producción:** HTTPS, CORS restringido, y sacar `JWT_SECRET` de un gestor de secretos.

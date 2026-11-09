# Ejercicio 1 – Criterios de aceptación: creación de tareas

**Requisito:** "Un usuario con sesión iniciada puede crear una tarea."

**Quién lo usa:** cualquier usuario registrado desde la app móvil (o un cliente de la API).

## Los tres criterios pedidos

| # | Tipo | Criterio (Dado / Cuando / Entonces) | Resultado observable |
|---|---|---|---|
| CA-1 | Éxito típico | **Dado** un usuario con sesión iniciada y lista vacía, **cuando** crea una tarea con el título `Plan tests`, **entonces** la tarea se guarda y aparece al principio de su lista como *Pending*. | `POST /api/v1/tasks` → **201** con `id`, `title: "Plan tests"`, `completed: false`. `GET /api/v1/tasks` la incluye. En la app se ve en la lista sin recargar. |
| CA-2 | Entrada inválida | **Dado** un usuario con sesión, **cuando** intenta crear una tarea cuyo título es solo espacios (`"   "`), **entonces** se rechaza con un mensaje claro y no se crea nada. | API → **400** `{"error":"Enter a valid title."}`. La lista sigue con el mismo número de tareas. En la app el campo muestra *Enter a valid title.* |
| CA-3 | Límite de permisos | **Dado** que el usuario A creó una tarea, **cuando** el usuario B pide esa tarea cambiando el id en la URL (`GET /api/v1/tasks/{id-de-A}`), **entonces** no puede verla, y la respuesta es idéntica a la de una tarea que no existe. | **404** `{"error":"Task not found."}` para B, igual que para un UUID inexistente; A sigue viéndola con **200**. |

## Criterios adicionales que salieron al pensar en riesgos (paso 3 de la sección)

- CA-4: Un título de **120** caracteres se acepta; uno de **121** se rechaza con 400 (no 500).
- CA-5: Sin token o con token expirado → **401**, nada se crea.
- CA-6: Un `ownerId` enviado en el cuerpo se ignora: la tarea siempre pertenece a quien llama.

## Priorización (paso 4)

| Prioridad | Criterio | Motivo |
|---|---|---|
| 1 | CA-3, CA-6 | Fuga de datos entre usuarios = impacto máximo |
| 2 | CA-1, CA-5 | Flujo principal y autenticación |
| 3 | CA-2, CA-4 | Validación; impacto menor pero probable |

## Trazabilidad (paso 5: qué se probó y dónde)

| Criterio | Prueba automatizada | Estado |
|---|---|---|
| CA-1 | `backend/test/integration/smoke.test.js` › *a task can be created*; `mobile/integration_test/app_test.dart` | ✅ backend · ⏳ móvil (sin ejecutar aquí) |
| CA-2 | `tasks.api.test.js` › *rejects an empty title* | ✅ |
| CA-3 | `tasks.api.test.js` › *does not let one user read another user task* | ✅ |
| CA-4 | `boundaries.test.js`, `tasks.api.test.js` › *121-character title returns 400* | ✅ |
| CA-5 | `tasks.api.test.js` › *rejects task creation without authentication*; `security.test.js` › *expired access token* | ✅ |
| CA-6 | `security.test.js` › *POST with ownerId still creates the task for the caller* | ✅ |

**Sin probar:** comportamiento con la app sin red al guardar (cubierto solo parcialmente en la sesión exploratoria, ver doc 03).

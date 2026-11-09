# Ejercicio 13 – Checklist de regresión

**Suite de humo** (después de cada build/deploy, ~1 s): `cd backend && npm run test:smoke`
→ API arriba · registro + login · la lista carga · se crea una tarea · logout funciona.

**Regresión:** marca lo que aplica según el área cambiada. "Auto" = cubierto por prueba automatizada (archivo › nombre).

## Creación

| # | Comprobación | Auto | ✔ |
|---|---|---|---|
| C1 | Título válido → 201 y aparece en la lista | smoke › *a task can be created* | ☐ |
| C2 | Título vacío / solo espacios → 400 | tasks.api › *rejects an empty title* | ☐ |
| C3 | Título ausente → 400 y no se crea nada | tasks.api › *missing title* | ☐ |
| C4 | 120 caracteres OK · 121 → 400 (no 500) | boundaries · tasks.api › *121-character* | ☐ |
| C5 | Título de tipo incorrecto → 400 | security › *title of wrong type* | ☐ |
| C6 | Sin token → 401 | tasks.api › *without authentication* | ☐ |
| C7 | `ownerId` en el body se ignora | security › *POST with ownerId* | ☐ |
| C8 | Doble tap no duplica (BUG-TM-045, abierto) | — manual | ☐ |

## Edición

| # | Comprobación | Auto | ✔ |
|---|---|---|---|
| E1 | Cambiar título propio → 200 | security › *PATCH with ownerId…* (renombra) | ☐ |
| E2 | Título inválido al editar → 400, el original no cambia | — añadir | ☐ |
| E3 | Id inválido → 400 · id desconocido → 404 | tasks.api › *invalid task id* / *unknown task id* | ☐ |
| E4 | `ownerId`/`owner_id` se ignoran | security › *ownerId cannot be set* | ☐ |
| E5 | Body sin campos válidos → 400 | security › *PATCH with only ownerId* | ☐ |
| E6 | Editar sin red no deja datos a medias | — manual (ver doc 03) | ☐ |

## Completar

| # | Comprobación | Auto | ✔ |
|---|---|---|---|
| K1 | Completar → 200 y **sigue en la lista** con `completed: true` | tasks.api › *BUG-TM-042* | ☐ |
| K2 | `completed` no booleano → 400 | security › *completed must be boolean* | ☐ |
| K3 | UI: casilla marcada + tachado + *Completed* | widget › *completion*; E2E app_test | ☐ |
| K4 | Desmarcar vuelve a *Pending* | — añadir | ☐ |

## Eliminar

| # | Comprobación | Auto | ✔ |
|---|---|---|---|
| D1 | Eliminar propia → 204 y desaparece | — añadir | ☐ |
| D2 | Eliminar con id inválido → 400 | tasks.api › *invalid task id* | ☐ |
| D3 | Eliminar dos veces → 404 la segunda | — añadir | ☐ |

## Acceso entre usuarios (siempre con **dos** cuentas)

| # | Comprobación | Auto | ✔ |
|---|---|---|---|
| X1 | B no puede **leer** la tarea de A | tasks.api › *does not let one user read* | ☐ |
| X2 | B no puede **actualizar** la tarea de A, y A la ve intacta | tasks.api › *cannot update another user task* | ☐ |
| X3 | B no puede **eliminar** la tarea de A | tasks.api › *cannot delete another user task* | ☐ |
| X4 | La **lista** de B no incluye tareas de A | tasks.api › *list only returns the caller own tasks* | ☐ |
| X5 | La respuesta para "ajena" = "inexistente" (no revela existencia) | tasks.api › *cannot update…* (compara cuerpos) | ☐ |
| X6 | Tras logout-all, los tokens viejos de A no sirven | security › *logout-all* | ☐ |

## Datos y entorno

- Datos sintéticos (`tester-<uuid>@example.test`, `local-test-password`), recreados en cada prueba.
- Solo se reinicia `taskmanager_test` (el código se niega a borrar otra BD).
- Registrar en cada corrida: commit/build de la API, versión de la app, dispositivo/SO.

# Ejercicio 3 – Sesión exploratoria: creación y edición de tareas

| | |
|---|---|
| **Charter** | Explorar la creación y edición de tareas para encontrar problemas de validación, duplicados y pérdida de datos. |
| **Duración** | 15 minutos |
| **Fecha** | 2026-11-09 |
| **Entorno** | API local (`node src/server.js`) · PostgreSQL 16 `taskmanager_dev` · cliente `curl` (la app Flutter no pudo ejecutarse en este entorno, así que se exploró la API, que es donde viven las reglas) |
| **Datos** | Usuario sintético `explorer-NNNN@example.test` |
| **Salida cruda** | `evidencia/ej03-exploratoria-salida.txt` · script reproducible `backend/scripts/explore-session.sh` |

## Notas de sesión

| Tiempo | Acción o condición | Observación | Seguimiento |
|---|---|---|---|
| 00:00 | Sesión iniciada como usuario nuevo | Lista vacía `{"items":[],...}` | La app debe mostrar *No tasks yet.* (cubierto por widget test) |
| 00:01 | Título ASCII de **120** caracteres | 201, se guarda completo | ✅ esperado |
| 00:02 | Título largo con **emoji**: 61 × 😀 (61 caracteres visibles) | **400 rechazado** | ❗ Sorpresa → BUG-TM-044 |
| 00:03 | 60 × 😀 | 201 aceptado | El límite real para emoji es 60, no 120 |
| 00:04 | Título vacío `""` | 400 | ✅ |
| 00:05 | Título solo con **espacio de ancho cero** (`​`) | **201 aceptado** → tarea "invisible" | ❗ Sorpresa → BUG-TM-043 |
| 00:06 | Título solo con espacios duros (`  `) | 400 | ✅ `trim()` sí los quita |
| 00:07 | Título con salto de línea `line1\nline2` | 201, se guarda con `\n` | ❓ Pregunta a producto: ¿se permiten títulos multilínea? ¿Cómo se ve en la lista? |
| 00:08 | **Taps rápidos repetidos**: 5 POST idénticos en paralelo | 5 × 201 → **5 tareas duplicadas** | ❗ → BUG-TM-045. En la app el botón *Save* cierra el diálogo, lo que mitiga, pero un doble tap antes de cerrar o un reintento de red duplicaría |
| 00:10 | Editar título con el **servidor caído** (conectividad interrumpida) | `curl` falla: *Couldn't connect* (sin código HTTP) | Verificar que nada cambió |
| 00:12 | Servidor reiniciado, GET de la tarea | Título original intacto; sin escritura parcial | ✅ Sin pérdida de datos |
| 00:13 | Mismo access token tras reinicio | 200, sigue válido | ✅ esperado (JWT sin estado + `token_version`) |
| 00:15 | Fin | | |

## Lo que me sorprendió

1. **Los emoji cuentan doble.** El límite de 120 se mide en unidades UTF-16 (`String.length` en JS y en Dart), así que un emoji ocupa 2. Para el usuario "61 caracteres" no se puede guardar, y el mensaje *Enter a valid title.* no explica por qué.
2. **Se puede crear una tarea invisible** con un carácter de ancho cero: `trim()` no lo considera espacio.
3. **No hay protección contra duplicados** (idempotencia) en la creación.

## Bugs encontrados (formato corto)

### BUG-TM-043 – Se acepta un título compuesto solo por caracteres invisibles
- **Pasos:** `POST /api/v1/tasks {"title":"​"}` con un token válido.
- **Esperado:** 400 *Enter a valid title.* (igual que con solo espacios).
- **Actual:** 201; la tarea aparece en la lista sin texto visible.
- **Severidad:** Baja · **Prioridad:** Media (confunde y es fácil de corregir: normalizar y quitar `\p{Cf}` antes de validar).

### BUG-TM-044 – El límite de 120 caracteres rechaza títulos de 61 emoji
- **Pasos:** crear una tarea con 61 × 😀.
- **Esperado:** se acepta (61 caracteres visibles ≤ 120), o el mensaje indica el límite real.
- **Actual:** 400 con mensaje genérico. 60 emoji sí funcionan.
- **Severidad:** Baja · **Prioridad:** Baja. **Nota:** PostgreSQL `VARCHAR(120)` cuenta *code points*, la API cuenta UTF-16: las capas no usan la misma definición de "carácter". Decidir una (p. ej. *grapheme clusters*) y aplicarla en app, API y BD.

### BUG-TM-045 – Peticiones repetidas crean tareas duplicadas
- **Pasos:** enviar 5 `POST /api/v1/tasks {"title":"Doble tap"}` simultáneos.
- **Esperado:** una sola tarea (p. ej. con cabecera `Idempotency-Key`), o la app impide el doble envío.
- **Actual:** 5 tareas idénticas.
- **Severidad:** Media · **Prioridad:** Media.

## No cubierto en esta sesión
- UI real en dispositivo (teclado, rotación, modo avión a mitad del guardado en la app).
- Edición concurrente de la misma tarea desde dos dispositivos.

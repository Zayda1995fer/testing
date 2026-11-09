# Ejercicio 2 – Reporte de bug: la tarea desaparece al marcarla como completada

> Escenario de práctica pedido por el tutorial. Los datos son sintéticos.

| Campo | Contenido |
|---|---|
| **ID** | BUG-TM-042 |
| **Resumen** | Al marcar una tarea como completada, desaparece de la lista y no vuelve al recargar. |
| **Entorno** | Android 14 (Pixel 7, emulador) · App 1.0.0+1 (build debug) · API build `local-2026-11-09` · BD `taskmanager_test` |
| **Precondiciones** | Usuario de prueba `tester@example.test` con sesión iniciada y **una** tarea pendiente: `Comprar café`. |
| **Pasos para reproducir** | 1. Abrir la app con sesión iniciada.<br>2. Ver que la lista muestra `Comprar café` como *Pending*.<br>3. Tocar la casilla de `Comprar café`.<br>4. Observar la lista.<br>5. Deslizar para recargar (o cerrar y abrir la app). |
| **Datos de prueba** | Título: `Comprar café`. Cuenta sintética; ninguna contraseña real. |
| **Resultado esperado** | La tarea sigue en la lista, con la casilla marcada, texto tachado y la etiqueta *Completed*. Tras recargar, sigue ahí con `completed: true`. |
| **Resultado actual** | La tarea desaparece inmediatamente al tocar la casilla. Tras recargar tampoco aparece. La lista muestra *No tasks yet.* |
| **Frecuencia** | 5 de 5 intentos. |
| **Evidencia** | Captura de pantalla antes/después (sin datos personales). Petición registrada (token redactado):<br>`PATCH /api/v1/tasks/3c3d…6fb  Authorization: Bearer [REDACTED]  {"completed":true}` → `200`<br>`GET /api/v1/tasks` → `200 {"items":[]}` |
| **Análisis inicial (opcional)** | El PATCH responde 200, así que el cambio llega al servidor; el GET siguiente ya no la devuelve. Sospecha: la consulta de lista filtra `completed = false`, o el PATCH borra en vez de actualizar. Pendiente de confirmar por desarrollo. |
| **Severidad** | **Alta** – pérdida aparente de datos del usuario; la funcionalidad principal (completar tareas) queda inutilizable. |
| **Prioridad** | **Alta (P1)** – afecta a todos los usuarios en el flujo más común; corregir antes del próximo release. |

## Justificación de severidad vs. prioridad

- **Severidad alta:** el usuario pierde de vista información propia; no hay manera de recuperarla desde la app.
- **Prioridad alta:** ocurre siempre, en un flujo diario. Si el fallo fuera solo visual (p. ej. la tarea sigue pero sin tachar), la severidad sería baja aunque la prioridad pudiera seguir siendo media.

## Prueba de regresión añadida

Para que el bug no vuelva, se dejaron pruebas que fallarían si reaparece:

- Backend: `backend/test/integration/tasks.api.test.js` › *regression: completed tasks stay in the list (BUG-TM-042)* ✅
- Móvil (E2E): `mobile/integration_test/app_test.dart` verifica que tras marcarla la tarea sigue visible y aparece como *Completed*.

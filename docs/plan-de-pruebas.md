# Plan de pruebas – Task Manager 1.0

| Campo | Contenido |
|---|---|
| **Funcionalidad / release** | Task Manager 1.0: registro, login, sesión con refresh, CRUD de tareas propias, logout / logout-all |
| **Alcance – incluido** | API REST `/api/v1`, validación, autorización por dueño, tokens, rate limit; app Flutter: login, lista (carga/vacía/error/datos), crear, completar, logout |
| **Alcance – excluido** | Recuperación de contraseña, notificaciones push, modo offline con sincronización, pruebas en producción |
| **Riesgos** | 1) Un usuario ve o modifica tareas de otro (datos) · 2) Robo/reuso de refresh token (seguridad) · 3) Tareas que desaparecen o se duplican (datos) · 4) Errores 500 ante entradas límite (disponibilidad) · 5) App inutilizable con lector de pantalla o texto grande (usuarios) |
| **Entorno** | Node 22 · PostgreSQL 16 `taskmanager_test` (pruebas) y `taskmanager_dev` (manual/carga) · Flutter stable · emulador Android + simulador iOS |
| **Datos de prueba** | Cuentas sintéticas `tester-<uuid>@example.test` / `local-test-password`; BD reiniciada antes de cada prueba (`resetTestDatabase` solo actúa sobre `*_test`) |
| **Tipos de prueba** | Unitarias (Jest, flutter_test) · Widgets · API/integración (Supertest + BD) · E2E (integration_test) · Exploratoria (charter de 15 min) · Seguridad básica (OWASP API) · Carga ligera (k6) · Accesibilidad · Compatibilidad · Humo y regresión |
| **Criterios de entrada** | API y app compilan; BD de pruebas disponible; criterios de aceptación escritos (doc 01) |
| **Criterios de salida** | 100 % de la suite backend en verde en CI · `flutter test` en verde · 0 bugs de severidad alta abiertos · humo OK en el build candidato · k6: errores < 1 % y p95 dentro del umbral |
| **Responsables** | QA: diseño y ejecución · Dev: corrección y pruebas unitarias · Producto: aprueba excepciones (p. ej. títulos multilínea) |
| **Evidencia** | `evidencia/` (salidas de pruebas, cobertura, k6, sesión exploratoria), sin tokens ni contraseñas reales |

## Estado al cierre de esta práctica

| Tipo | Resultado |
|---|---|
| Backend (unit + API + seguridad + humo) | **79/79 ✅** · cobertura de líneas 92 % |
| k6 | Corrida base ✅ · corrida con umbral estricto ❌ a propósito |
| Exploratoria | 3 bugs nuevos (BUG-TM-043/044/045, severidad baja–media) |
| Flutter (unit, widget, E2E) | Escritas, **sin ejecutar** (no había SDK de Flutter en el entorno) |
| Accesibilidad / compatibilidad en dispositivo | Pendiente: protocolo y hojas listas en docs 11 y 12 |

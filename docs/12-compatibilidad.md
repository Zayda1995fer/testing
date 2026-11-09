# Ejercicio 12 – Compatibilidad: lista de tareas en pantalla pequeña y grande

> Igual que en el ejercicio 11: sin dispositivos ni SDK de Flutter en el entorno de preparación.
> Se dejan **pruebas automatizadas que simulan tamaños de pantalla** y la matriz manual para llenar.

## Matriz de dispositivos (basada en riesgo)

| Plataforma | Perfil | Pantalla lógica | Versión de SO | Qué revisar |
|---|---|---|---|---|
| Android | Pequeño (p. ej. Galaxy A0x) | 320–360 × 640 dp | Mínimo soportado (API 24 / Android 7) | Login, texto grande, red |
| Android | Actual común (Pixel 8) | 412 × 915 dp | Android 15 | CRUD, refresh, logout |
| iOS | Pequeño (iPhone SE 3) | 375 × 667 pt | iOS mínimo soportado | Layout, almacenamiento seguro, accesibilidad |
| iOS | Actual (iPhone 16) | 393 × 852 pt | iOS 18 | Login, ciclo de vida, recuperación de red |
| Emulador | Desarrollo | 320 × 568 y 1024 × 1366 | Toolchain actual | Smoke automatizado |

## Pruebas automatizadas que simulan pantallas

En `mobile/test/task_list_panel_test.dart` › *layout robustness*:

| Caso | Tamaño | Escala de texto | Verifica |
|---|---|---|---|
| Lista con título de ~120 caracteres | 320×568 | ×1, ×2, ×3 | `tester.takeException()` es `null` (sin *RenderFlex overflow*) |
| Error + Retry | 320×568 | ×3 | Sin desbordamiento y el botón sigue presente |

Puedes añadir el caso de pantalla grande copiando la prueba con `Size(1024, 1366)`.

## Revisión de layout en el código

| Elemento | Pantalla pequeña | Pantalla grande |
|---|---|---|
| `ListView` de tareas | Hace scroll; los títulos largos se envuelven | Las filas se estiran a todo el ancho: en tableta se ve vacío. **Sugerencia:** limitar el ancho (`ConstrainedBox(maxWidth: 600)`) |
| Pantalla de login | `ListView` → no se desborda con el teclado abierto | Campos muy anchos; mismo ajuste de ancho máximo |
| `AppBar` con *My tasks* + logout | Título corto, cabe | ✅ |
| Diálogo *New task* | `AlertDialog` se adapta; con texto ×3 el contador puede bajar de línea | ✅ |

## Hoja para la prueba manual

| Dispositivo | Overflow (franjas amarillas/negras) | Texto recortado | Controles difíciles de tocar | Notas |
|---|---|---|---|---|
| Pantalla pequeña | | | | |
| Pantalla grande | | | | |

# Ejercicio 11 – Usabilidad y accesibilidad

> **Qué es real y qué falta.** Este ejercicio exige un lector de pantalla en un dispositivo.
> No había dispositivo ni SDK de Flutter en el entorno donde se preparó la entrega, así que:
> 1. se **revisó el código** de la app con el checklist y se corrigió lo encontrado;
> 2. se escribieron **pruebas automatizadas** de accesibilidad (`mobile/test/task_list_panel_test.dart`);
> 3. queda abajo el **protocolo manual** con la tabla lista para llenar en tu teléfono.

## 1. Revisión de código con el checklist

| Punto del checklist | Estado en el código | Acción |
|---|---|---|
| Contraste suficiente | Colores de Material 3 (`colorSchemeSeed`) | Prueba `textContrastGuideline` |
| Botones con nombre accesible | FAB → `tooltip: 'Add task'`; logout → `tooltip: 'Log out'`; reintento con texto *Retry* | ✅ añadidos |
| Lector anuncia títulos, estado y errores | Cada tarea tiene título + subtítulo *Completed/Pending*; errores en `Semantics(liveRegion: true)` | ✅ |
| Usable con texto grande | Lista y error en contenedores con scroll/padding | Pruebas a ×1, ×2, ×3 |
| Objetivos táctiles fáciles | `CheckboxListTile` (fila completa táctil) | `androidTapTargetGuideline` (48 dp), `iOSTapTargetGuideline` (44 pt) |
| Errores explican cómo recuperarse | *Could not load tasks.* + botón **Retry**; sin red: *No connection. Check your network and try again.* | ✅ |
| El color no es lo único que comunica estado | Completada = casilla + tachado + texto *Completed* | Prueba *completed status is shown as text* |
| Teclado / switch | Orden de foco natural (email → password → botón) | Verificar en dispositivo |
| Indicador de carga | `CircularProgressIndicator(semanticsLabel: 'Loading tasks')` | Prueba de etiqueta |

**Riesgos detectados en la revisión (verificar en dispositivo):**
- Los `SnackBar` de error (*Could not save the task.*) desaparecen solos; con TalkBack/VoiceOver pueden no leerse a tiempo.
- El contador `0/120` del campo de título se anuncia en cada tecla; puede resultar ruidoso.
- Un título largo en la lista se envuelve en varias líneas; confirmar que no se recorta a ×3.

## 2. Pruebas automatizadas escritas

`flutter test test/task_list_panel_test.dart`:
- `meetsGuideline(androidTapTargetGuideline | iOSTapTargetGuideline | labeledTapTargetGuideline | textContrastGuideline)`
- Etiqueta semántica del indicador de carga.
- Sin desbordamientos a escala de texto ×1, ×2 y ×3 en pantalla de 320×568.

## 3. Protocolo manual (para hacerlo en el teléfono)

1. Activa **TalkBack** (Android) o **VoiceOver** (iOS) y sube el tamaño de texto al máximo.
2. Inicia sesión con la cuenta de prueba.
3. Crea una tarea `Probar accesibilidad`.
4. Provoca un error de validación: abre *New task*, deja el título en blanco y toca **Save**.
5. Marca la tarea como completada y cierra sesión.

| # | Pantalla / control | ¿Qué anuncia el lector? | ¿Sin etiqueta? | ¿Recortado / tapado? | Notas |
|---|---|---|---|---|---|
| 1 | Campo Email | | | | |
| 2 | Campo Password | | | | |
| 3 | Botón Sign in | | | | |
| 4 | Botón + (Add task) | | | | |
| 5 | Campo Title + contador | | | | |
| 6 | Error *Enter a valid title.* | | | | |
| 7 | Fila de tarea (casilla) | | | | |
| 8 | Botón Log out | | | | |

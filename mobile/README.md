# App Flutter (Task Manager)

> **Nota:** este código Flutter se escribió pero **no se pudo ejecutar** en el entorno donde se
> preparó la entrega (el SDK de Flutter no estaba disponible). Ejecuta los pasos de abajo en tu
> máquina; si algo falla, el error de `flutter analyze` / `flutter test` indicará la línea.

## Preparar

```bash
cd mobile
flutter create . --project-name my_app   # genera android/ ios/ sin tocar lib/ ni test/
flutter pub get
flutter analyze
```

## Pruebas unitarias y de widgets (secciones 4, 5, 11, 12, 15)

```bash
flutter test
```

| Archivo | Qué cubre |
|---|---|
| `test/task_test.dart` | Ej. 4: id ausente (4 variantes) y título en el máximo (120) y 121 |
| `test/task_list_panel_test.dart` | Ej. 5: botón Retry llamado **exactamente una vez**; estados; accesibilidad (tap targets, etiquetas, contraste); pantalla 320×568 con texto ×1, ×2, ×3 |
| `test/api_client_test.dart` | Ej. 15: cliente con `MockClient` |

## Recorrido E2E (sección 7)

1. Levanta la API contra una BD **de pruebas** (ver `../backend/README.md`).
2. Crea el usuario de prueba (sintético) y deja su lista vacía:

   ```bash
   curl -s -XPOST localhost:3000/api/v1/auth/register -H 'Content-Type: application/json' \
     -d '{"email":"tester@example.test","password":"local-test-password"}'
   ```

3. Con un emulador abierto:

   ```bash
   # Android emulator: 10.0.2.2 apunta al localhost de tu PC
   flutter test integration_test/app_test.dart --dart-define=API_BASE_URL=http://10.0.2.2:3000
   # iOS simulator:
   flutter test integration_test/app_test.dart --dart-define=API_BASE_URL=http://localhost:3000
   ```

Antes de cada corrida, borra las tareas del usuario de prueba (o vuelve a crear la BD de pruebas)
para que la prueba sea repetible.

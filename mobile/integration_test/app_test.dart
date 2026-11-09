// Sección 7 – Recorrido completo (EJERCICIO 7: crear, completar, cerrar sesión).
//
// Requisitos:
//   1. API local corriendo contra una BD de PRUEBAS (nunca producción).
//   2. Usuario de prueba creado y sin tareas (ver mobile/README.md):
//        email: tester@example.test   password: local-test-password
//   3. Ejecutar:
//        flutter test integration_test/app_test.dart \
//          --dart-define=API_BASE_URL=http://10.0.2.2:3000   # emulador Android
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:my_app/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('user can sign in, create a task, complete it and log out', (tester) async {
    app.main();
    await tester.pumpAndSettle();

    // Iniciar sesión
    await tester.enterText(find.byKey(const Key('email-field')), 'tester@example.test');
    await tester.enterText(find.byKey(const Key('password-field')), 'local-test-password');
    await tester.tap(find.byKey(const Key('login-button')));
    await tester.pumpAndSettle();

    // Crear tarea
    await tester.tap(find.byKey(const Key('add-task-button')));
    await tester.pumpAndSettle();
    await tester.enterText(find.byKey(const Key('task-title-field')), 'Check release flow');
    await tester.tap(find.byKey(const Key('save-task-button')));
    await tester.pumpAndSettle();

    expect(find.text('Check release flow'), findsOneWidget);

    // --- EJERCICIO 7: marcar como completada ---
    final tile = find.widgetWithText(CheckboxListTile, 'Check release flow');
    expect(tester.widget<CheckboxListTile>(tile).value, isFalse);

    await tester.tap(find.descendant(of: tile, matching: find.byType(Checkbox)));
    await tester.pumpAndSettle();

    // Sigue en la lista (regresión BUG-TM-042) y aparece como completada.
    expect(find.text('Check release flow'), findsOneWidget);
    expect(tester.widget<CheckboxListTile>(tile).value, isTrue);
    expect(find.descendant(of: tile, matching: find.text('Completed')), findsOneWidget);

    // --- EJERCICIO 7: cerrar sesión y verificar pantalla de login ---
    await tester.tap(find.byKey(const Key('logout-button')));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key('login-button')), findsOneWidget);
    expect(find.byKey(const Key('email-field')), findsOneWidget);
    expect(find.text('My tasks'), findsNothing);
  });
}

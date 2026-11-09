// Sección 5 – Pruebas de widgets (+ apoyo automatizado a las secciones 11 y 12).
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/task.dart';
import 'package:my_app/task_list_panel.dart';

Widget wrap(Widget child, {double textScale = 1.0}) => MaterialApp(
      home: Builder(
        builder: (context) => MediaQuery(
          data: MediaQuery.of(context).copyWith(textScaler: TextScaler.linear(textScale)),
          child: Scaffold(body: child),
        ),
      ),
    );

const planTests = Task(id: 'task-1', title: 'Plan tests');

void main() {
  // --- Estados del tutorial ---
  testWidgets('shows loading state', (tester) async {
    await tester.pumpWidget(wrap(const TaskListPanel(loading: true, tasks: [])));
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('shows empty state', (tester) async {
    await tester.pumpWidget(wrap(const TaskListPanel(loading: false, tasks: [])));
    expect(find.text('No tasks yet.'), findsOneWidget);
  });

  testWidgets('shows error state', (tester) async {
    await tester.pumpWidget(wrap(const TaskListPanel(
      loading: false,
      tasks: [],
      errorMessage: 'Could not load tasks.',
    )));
    expect(find.text('Could not load tasks.'), findsOneWidget);
  });

  testWidgets('shows task data', (tester) async {
    await tester.pumpWidget(wrap(const TaskListPanel(loading: false, tasks: [planTests])));
    expect(find.text('Plan tests'), findsOneWidget);
  });

  // --- EJERCICIO 5: botón de reintento ---
  group('retry button (exercise 5)', () {
    testWidgets('tapping Retry invokes the callback exactly once', (tester) async {
      var calls = 0;
      await tester.pumpWidget(wrap(TaskListPanel(
        loading: false,
        tasks: const [],
        errorMessage: 'Could not load tasks.',
        onRetry: () => calls++,
      )));

      await tester.tap(find.byKey(const Key('retry-button')));
      await tester.pump();

      expect(calls, 1);
    });

    testWidgets('no Retry button when no callback is provided', (tester) async {
      await tester.pumpWidget(wrap(const TaskListPanel(
        loading: false,
        tasks: [],
        errorMessage: 'Could not load tasks.',
      )));
      expect(find.byKey(const Key('retry-button')), findsNothing);
    });

    testWidgets('no Retry button outside the error state', (tester) async {
      await tester.pumpWidget(wrap(TaskListPanel(
        loading: false,
        tasks: const [planTests],
        onRetry: () {},
      )));
      expect(find.byKey(const Key('retry-button')), findsNothing);
    });
  });

  group('completion', () {
    testWidgets('toggling the checkbox reports the task and new value', (tester) async {
      Task? toggled;
      bool? value;
      await tester.pumpWidget(wrap(TaskListPanel(
        loading: false,
        tasks: const [planTests],
        onToggleComplete: (t, v) {
          toggled = t;
          value = v;
        },
      )));

      await tester.tap(find.byType(Checkbox));
      expect(toggled?.id, 'task-1');
      expect(value, isTrue);
    });

    testWidgets('completed status is shown as text, not only color', (tester) async {
      await tester.pumpWidget(wrap(const TaskListPanel(
        loading: false,
        tasks: [Task(id: 't', title: 'Done task', completed: true)],
      )));
      expect(find.text('Completed'), findsOneWidget);
    });
  });

  // --- Apoyo a la sección 11 (accesibilidad) ---
  group('accessibility', () {
    testWidgets('meets Flutter accessibility guidelines', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(wrap(TaskListPanel(
        loading: false,
        tasks: const [planTests, Task(id: 't2', title: 'Second', completed: true)],
        onToggleComplete: (_, __) {},
      )));

      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
      handle.dispose();
    });

    testWidgets('error state with Retry meets tap-target and label guidelines', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(wrap(TaskListPanel(
        loading: false,
        tasks: const [],
        errorMessage: 'Could not load tasks.',
        onRetry: () {},
      )));
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      handle.dispose();
    });

    testWidgets('loading indicator has a semantics label', (tester) async {
      final handle = tester.ensureSemantics();
      await tester.pumpWidget(wrap(const TaskListPanel(loading: true, tasks: [])));
      expect(find.bySemanticsLabel('Loading tasks'), findsOneWidget);
      handle.dispose();
    });
  });

  // --- Apoyo a las secciones 11 y 12: texto grande y pantalla pequeña ---
  group('layout robustness', () {
    final longTitle = 'Revisar ' * 15; // ~120 caracteres

    for (final scale in [1.0, 2.0, 3.0]) {
      testWidgets('no overflow on a small screen (320×568) at text scale $scale', (tester) async {
        tester.view.physicalSize = const Size(320, 568);
        tester.view.devicePixelRatio = 1.0;
        addTearDown(tester.view.reset);

        await tester.pumpWidget(wrap(
          TaskListPanel(
            loading: false,
            tasks: [Task(id: 't', title: longTitle.trim()), planTests],
            onToggleComplete: (_, __) {},
          ),
          textScale: scale,
        ));

        // Un RenderFlex overflow lanza una excepción que falla la prueba.
        expect(tester.takeException(), isNull);
      });
    }

    testWidgets('error + Retry fits at text scale 3.0 on a small screen', (tester) async {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(wrap(
        TaskListPanel(
          loading: false,
          tasks: const [],
          errorMessage: 'Could not load tasks. Check your connection and try again.',
          onRetry: () {},
        ),
        textScale: 3.0,
      ));
      expect(tester.takeException(), isNull);
      expect(find.byKey(const Key('retry-button')), findsOneWidget);
    });
  });
}

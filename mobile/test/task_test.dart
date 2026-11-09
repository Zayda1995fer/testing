// Sección 4 – Pruebas unitarias del modelo (flutter_test).
import 'package:flutter_test/flutter_test.dart';
import 'package:my_app/task.dart';

void main() {
  // --- Pruebas originales del tutorial ---
  test('parses a valid task', () {
    final task = Task.fromJson({'id': 'task-1', 'title': 'Plan tests'});

    expect(task.id, 'task-1');
    expect(task.title, 'Plan tests');
  });

  test('rejects an empty title', () {
    expect(
      () => Task.fromJson({'id': 'task-1', 'title': '  '}),
      throwsFormatException,
    );
  });

  // --- EJERCICIO 4: id ausente ---
  group('missing id', () {
    test('rejects JSON without an id key', () {
      expect(() => Task.fromJson({'title': 'Plan tests'}), throwsFormatException);
    });

    test('rejects a null id', () {
      expect(() => Task.fromJson({'id': null, 'title': 'Plan tests'}), throwsFormatException);
    });

    test('rejects an empty-string id', () {
      expect(() => Task.fromJson({'id': '', 'title': 'Plan tests'}), throwsFormatException);
    });

    test('rejects a numeric id (wrong type)', () {
      expect(() => Task.fromJson({'id': 1, 'title': 'Plan tests'}), throwsFormatException);
    });
  });

  // --- EJERCICIO 4: título válido en la longitud máxima permitida ---
  group('title length boundary', () {
    test('accepts a title at the maximum allowed length (120)', () {
      final title = 'a' * Task.maxTitleLength;
      final task = Task.fromJson({'id': 'task-1', 'title': title});

      expect(task.title, title);
      expect(task.title.length, 120);
    });

    test('rejects a title one character over the maximum (121)', () {
      expect(
        () => Task.fromJson({'id': 'task-1', 'title': 'a' * (Task.maxTitleLength + 1)}),
        throwsFormatException,
      );
    });
  });

  group('completed flag', () {
    test('defaults to false when absent', () {
      expect(Task.fromJson({'id': 't', 'title': 'x'}).completed, isFalse);
    });

    test('rejects a non-boolean value', () {
      expect(
        () => Task.fromJson({'id': 't', 'title': 'x', 'completed': 'yes'}),
        throwsFormatException,
      );
    });
  });
}

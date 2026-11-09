'use strict';

// Sección 4 – Pruebas unitarias (Jest). Sin red ni base de datos.
const { validateTitle, validateTaskId } = require('../../src/tasks/validation');

describe('validateTitle', () => {
  // --- Pruebas originales del tutorial ---
  test('trims a valid title', () => {
    expect(validateTitle('  Plan tests  ')).toBe('Plan tests');
  });

  test('rejects a blank title', () => {
    expect(() => validateTitle('   ')).toThrow('Enter a valid title.');
  });

  test('rejects a title longer than the limit', () => {
    expect(() => validateTitle('a'.repeat(121))).toThrow();
  });

  // --- EJERCICIO 4: título válido con la longitud MÁXIMA permitida ---
  test('accepts a title at the maximum allowed length (120)', () => {
    const title = 'a'.repeat(120);
    expect(validateTitle(title)).toBe(title);
    expect(validateTitle(title)).toHaveLength(120);
  });

  test('measures the limit after trimming (120 chars + surrounding spaces is valid)', () => {
    const title = 'b'.repeat(120);
    expect(validateTitle(`   ${title}   `)).toBe(title);
  });
});

// --- EJERCICIO 4: id ausente ---
describe('validateTaskId', () => {
  test.each([
    ['undefined (missing)', undefined],
    ['null', null],
    ['empty string', ''],
  ])('rejects a missing id: %s', (_label, value) => {
    expect(() => validateTaskId(value)).toThrow('Invalid task id.');
  });

  test('rejects a malformed id', () => {
    expect(() => validateTaskId('task-1')).toThrow('Invalid task id.');
  });

  test('accepts a UUID', () => {
    const id = '3f2b8c1e-5d4a-4c7b-9e2f-1a2b3c4d5e6f';
    expect(validateTaskId(id)).toBe(id);
  });
});

'use strict';

// Sección 8 – Valores límite y particiones de equivalencia.
// Las tablas son las mismas que en docs/08-valores-limite.md.
const { validateTitle } = require('../../src/tasks/validation');
const { validatePassword } = require('../../src/auth/validation');

describe('title partitions and boundaries (1..120)', () => {
  test.each([
    ['empty', '', false],
    ['whitespace only', ' ', false],
    ['minimum valid length', 'a', true],
    ['typical valid title', 'Plan tests', true],
    ['maximum valid length', 'a'.repeat(120), true],
    ['just over maximum', 'a'.repeat(121), false],
    ['wrong type (number)', 42, false],
  ])('%s', (_label, input, valid) => {
    if (valid) expect(() => validateTitle(input)).not.toThrow();
    else expect(() => validateTitle(input)).toThrow();
  });
});

// EJERCICIO 8: mismo enfoque aplicado al campo contraseña (8..72 bytes).
// Todos los valores son sintéticos; ninguno es una contraseña real.
describe('password partitions and boundaries (8..72 bytes)', () => {
  test.each([
    ['empty', '', false],
    ['whitespace only (8 spaces)', ' '.repeat(8), false],
    ['just below minimum (7)', 'x'.repeat(7), false],
    ['minimum valid length (8)', 'x'.repeat(8), true],
    ['typical value', 'synthetic-Pass-2026', true],
    ['maximum valid length (72)', 'x'.repeat(72), true],
    ['just over maximum (73)', 'x'.repeat(73), false],
    ['multibyte at limit: 24 × "€" (3 bytes each) = 72 bytes', '€'.repeat(24), true],
    ['multibyte over limit: 25 × "€" = 75 bytes', '€'.repeat(25), false],
    ['wrong type (number)', 12345678, false],
    ['wrong type (null)', null, false],
  ])('%s', (_label, input, valid) => {
    if (valid) expect(() => validatePassword(input)).not.toThrow();
    else expect(() => validatePassword(input)).toThrow();
  });

  test('does not trim the password (spaces are significant)', () => {
    expect(validatePassword('  padded-pass  ')).toBe('  padded-pass  ');
  });
});

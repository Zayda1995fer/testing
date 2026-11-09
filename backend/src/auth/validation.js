'use strict';

/**
 * Reglas de contraseña del Task Manager (ejercicio 8):
 *  - Mínimo 8 caracteres.
 *  - Máximo 72 BYTES (límite real de bcrypt: lo que pase de 72 bytes se ignora
 *    silenciosamente, así que lo rechazamos en vez de truncar).
 *  - No puede ser solo espacios.
 */
const PASSWORD_MIN = 8;
const PASSWORD_MAX_BYTES = 72;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * @param {unknown} value - Untrusted password input.
 * @returns {string} The password, unchanged (never trimmed).
 * @throws {TypeError}
 */
function validatePassword(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Enter a valid password.');
  }
  if (value.trim().length === 0) {
    throw new TypeError('Enter a valid password.');
  }
  if (value.length < PASSWORD_MIN) {
    throw new TypeError(`Password must have at least ${PASSWORD_MIN} characters.`);
  }
  if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new TypeError('Password is too long.');
  }
  return value;
}

/**
 * @param {unknown} value
 * @returns {string} Normalised (trimmed, lower-case) email.
 */
function validateEmail(value) {
  if (typeof value !== 'string') throw new TypeError('Enter a valid email.');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    throw new TypeError('Enter a valid email.');
  }
  return email;
}

module.exports = { validatePassword, validateEmail, PASSWORD_MIN, PASSWORD_MAX_BYTES };

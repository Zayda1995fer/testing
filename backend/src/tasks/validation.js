'use strict';

const TITLE_MIN = 1;
const TITLE_MAX = 120;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Trims and validates a task title.
 *
 * @param {unknown} value - Untrusted title input.
 * @returns {string} The validated title.
 * @throws {TypeError} When the title is not valid.
 */
function validateTitle(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Enter a valid title.');
  }

  const title = value.trim();
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    throw new TypeError('Enter a valid title.');
  }

  return title;
}

/**
 * Validates a task identifier (UUID).
 *
 * @param {unknown} value - Untrusted id (path param or JSON field).
 * @returns {string} The id.
 * @throws {TypeError} When the id is missing or malformed.
 */
function validateTaskId(value) {
  if (typeof value !== 'string' || !UUID_RE.test(value)) {
    throw new TypeError('Invalid task id.');
  }
  return value;
}

/**
 * Validates the optional `completed` flag.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
function validateCompleted(value) {
  if (typeof value !== 'boolean') {
    throw new TypeError('completed must be true or false.');
  }
  return value;
}

module.exports = { validateTitle, validateTaskId, validateCompleted, TITLE_MIN, TITLE_MAX };

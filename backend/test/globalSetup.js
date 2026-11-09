'use strict';

// Crea el esquema en la BD de pruebas antes de cualquier test.
module.exports = async () => {
  process.env.NODE_ENV = 'test';
  const { migrate, pool } = require('../src/db');
  await migrate();
  await pool.end();
};

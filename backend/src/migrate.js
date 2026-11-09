'use strict';

const { migrate, pool } = require('./db');

migrate()
  .then(() => console.log('Migration complete'))
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

'use strict';

const { app } = require('./app');
const { migrate } = require('./db');
const { config } = require('./config');

migrate()
  .then(() => {
    app.listen(config.port, () => console.log(`Task Manager API on http://localhost:${config.port}`));
  })
  .catch((err) => {
    console.error('Could not start:', err.message);
    process.exit(1);
  });

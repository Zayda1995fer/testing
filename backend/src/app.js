'use strict';

const express = require('express');
const helmet = require('helmet');
const { config } = require('./config');
const { createAuthRouter } = require('./auth/routes');
const { createTasksRouter } = require('./tasks/routes');

/**
 * Crea una instancia nueva de la app. Las pruebas pueden pasar límites
 * propios (p. ej. un rate limit bajo) sin afectar a otras pruebas.
 *
 * @param {{authRateLimit?: {windowMs: number, max: number}}} [options]
 */
function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '10kb' })); // body acotado (OWASP API4)

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1/auth', createAuthRouter(options.authRateLimit || config.authRateLimit));
  app.use('/api/v1/tasks', createTasksRouter());

  app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

  // Errores: mensaje seguro, sin stack ni detalles de SQL hacia el cliente.
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Payload too large.' });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON.' });
    if (process.env.NODE_ENV !== 'test') console.error(err);
    return res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}

const app = createApp();

module.exports = { app, createApp };

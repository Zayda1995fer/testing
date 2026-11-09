'use strict';

/**
 * Configuración leída del entorno. Los valores por defecto SOLO sirven para
 * desarrollo y pruebas locales; en producción todas las claves deben venir
 * de variables de entorno.
 */
const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://postgres@localhost:5432/taskmanager_test',
  jwtSecret: process.env.JWT_SECRET || 'local-test-secret-do-not-use-in-prod',
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL || 900), // 15 min
  refreshTokenTtlSeconds: Number(process.env.REFRESH_TOKEN_TTL || 60 * 60 * 24 * 7),
  authRateLimit: {
    windowMs: Number(process.env.AUTH_RATE_WINDOW_MS || 60_000),
    max: Number(process.env.AUTH_RATE_MAX || 20),
  },
};

module.exports = { config };

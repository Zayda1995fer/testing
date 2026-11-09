'use strict';

const { Pool } = require('pg');
const { config } = require('./config');

const pool = new Pool({ connectionString: config.databaseUrl, max: 10 });

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tasks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      VARCHAR(120) NOT NULL,
  completed  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_owner_idx ON tasks(owner_id);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  family_id   UUID NOT NULL,
  token_hash  TEXT NOT NULL UNIQUE,
  used_at     TIMESTAMPTZ,
  revoked_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_family_idx ON refresh_tokens(family_id);
`;

/** Crea las tablas si no existen. */
async function migrate() {
  await pool.query(SCHEMA);
}

/** Borra todos los datos. Usar SOLO contra la base de datos de pruebas. */
async function resetTestDatabase() {
  if (!/_test(\?|$)/.test(config.databaseUrl)) {
    throw new Error('Refusing to reset a database whose name does not end in _test');
  }
  await pool.query('TRUNCATE refresh_tokens, tasks, users RESTART IDENTITY CASCADE');
}

module.exports = { pool, migrate, resetTestDatabase };

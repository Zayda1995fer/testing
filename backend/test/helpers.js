'use strict';

const crypto = require('node:crypto');
const request = require('supertest');
const { app } = require('../src/app');

process.env.NODE_ENV = 'test';

/** Contraseña sintética: nunca usar una contraseña real en pruebas. */
const TEST_PASSWORD = 'local-test-password';

/** Registra un usuario sintético único y devuelve su email y tokens. */
async function createTestUser(targetApp = app) {
  const email = `tester-${crypto.randomUUID()}@example.test`;
  await request(targetApp)
    .post('/api/v1/auth/register')
    .send({ email, password: TEST_PASSWORD })
    .expect(201);
  const login = await request(targetApp)
    .post('/api/v1/auth/login')
    .send({ email, password: TEST_PASSWORD })
    .expect(200);
  return { email, ...login.body };
}

async function createTestUserAndGetToken() {
  return (await createTestUser()).accessToken;
}

/** Crea una tarea con el token dado y devuelve su id. */
async function createTask(token, title) {
  const res = await request(app)
    .post('/api/v1/tasks')
    .set('Authorization', `Bearer ${token}`)
    .send({ title })
    .expect(201);
  return res.body.id;
}

module.exports = { app, createTestUser, createTestUserAndGetToken, createTask, TEST_PASSWORD };

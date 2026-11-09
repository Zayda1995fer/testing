'use strict';

// Sección 13 – Suite de humo: lo mínimo crítico tras cada build/deploy.
// Ejecutar con: npm run test:smoke
const request = require('supertest');
const { pool, resetTestDatabase } = require('../../src/db');
const { app, TEST_PASSWORD } = require('../helpers');

beforeAll(() => resetTestDatabase());
afterAll(() => pool.end());

describe('smoke', () => {
  const email = 'smoke-user@example.test';
  let tokens;

  test('API is up', async () => {
    expect((await request(app).get('/health')).body).toEqual({ status: 'ok' });
  });

  test('register + login work', async () => {
    await request(app).post('/api/v1/auth/register').send({ email, password: TEST_PASSWORD }).expect(201);
    const res = await request(app).post('/api/v1/auth/login').send({ email, password: TEST_PASSWORD }).expect(200);
    tokens = res.body;
  });

  test('task list loads', async () => {
    await request(app).get('/api/v1/tasks').set('Authorization', `Bearer ${tokens.accessToken}`).expect(200);
  });

  test('a task can be created', async () => {
    await request(app)
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ title: 'Smoke task' })
      .expect(201);
  });

  test('logout works', async () => {
    await request(app).post('/api/v1/auth/logout').send({ refreshToken: tokens.refreshToken }).expect(204);
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
  });
});

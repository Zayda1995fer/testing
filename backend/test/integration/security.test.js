'use strict';

// Sección 9 – Comportamiento negativo y seguridad básica (solo entorno local).
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { pool, resetTestDatabase } = require('../../src/db');
const { config } = require('../../src/config');
const { createApp } = require('../../src/app');
const { app, createTestUser, createTestUserAndGetToken, createTask, TEST_PASSWORD } = require('../helpers');

beforeEach(() => resetTestDatabase());
afterAll(() => pool.end());

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('EJERCICIO 9: ownerId cannot be set by the client', () => {
  test('PATCH with ownerId/owner_id is ignored; ownership stays server-derived', async () => {
    const owner = await createTestUser();
    const attacker = await createTestUser();
    const taskId = await createTask(owner.accessToken, 'Owner task');

    const { rows: [attackerRow] } = await pool.query('SELECT id FROM users WHERE email = $1', [attacker.email]);
    const { rows: [ownerRow] } = await pool.query('SELECT id FROM users WHERE email = $1', [owner.email]);

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set(auth(owner.accessToken))
      .send({ title: 'Renamed', ownerId: attackerRow.id, owner_id: attackerRow.id });

    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('ownerId');
    expect(res.body).not.toHaveProperty('owner_id');

    const { rows: [task] } = await pool.query('SELECT owner_id, title FROM tasks WHERE id = $1', [taskId]);
    expect(task.owner_id).toBe(ownerRow.id);
    expect(task.title).toBe('Renamed');

    // El "atacante" sigue sin poder verla.
    expect((await request(app).get(`/api/v1/tasks/${taskId}`).set(auth(attacker.accessToken))).status).toBe(404);
  });

  test('POST with ownerId still creates the task for the caller', async () => {
    const owner = await createTestUser();
    const victim = await createTestUser();
    const { rows: [victimRow] } = await pool.query('SELECT id FROM users WHERE email = $1', [victim.email]);

    await request(app)
      .post('/api/v1/tasks')
      .set(auth(owner.accessToken))
      .send({ title: 'Planted', ownerId: victimRow.id })
      .expect(201);

    const victimList = await request(app).get('/api/v1/tasks').set(auth(victim.accessToken));
    expect(victimList.body.items).toHaveLength(0);
  });

  test('PATCH with only ownerId is rejected (nothing valid to update)', async () => {
    const token = await createTestUserAndGetToken();
    const taskId = await createTask(token, 'x');
    const res = await request(app).patch(`/api/v1/tasks/${taskId}`).set(auth(token)).send({ ownerId: 'whatever' });
    expect(res.status).toBe(400);
  });
});

describe('invalid input is rejected safely', () => {
  test.each([
    ['number', 42],
    ['array', ['a']],
    ['object', { a: 1 }],
    ['null', null],
    ['boolean', true],
  ])('title of wrong type (%s) -> 400', async (_l, title) => {
    const token = await createTestUserAndGetToken();
    const res = await request(app).post('/api/v1/tasks').set(auth(token)).send({ title });
    expect(res.status).toBe(400);
  });

  test('completed must be boolean', async () => {
    const token = await createTestUserAndGetToken();
    const id = await createTask(token, 'x');
    const res = await request(app).patch(`/api/v1/tasks/${id}`).set(auth(token)).send({ completed: 'yes' });
    expect(res.status).toBe(400);
  });

  test('oversized body -> 413 without leaking internals', async () => {
    const token = await createTestUserAndGetToken();
    const res = await request(app).post('/api/v1/tasks').set(auth(token)).send({ title: 'a'.repeat(20_000) });
    expect(res.status).toBe(413);
    expect(JSON.stringify(res.body)).not.toMatch(/stack|at \w+ \(/);
  });

  test('malformed JSON -> 400', async () => {
    const token = await createTestUserAndGetToken();
    const res = await request(app)
      .post('/api/v1/tasks')
      .set(auth(token))
      .set('Content-Type', 'application/json')
      .send('{"title": ');
    expect(res.status).toBe(400);
  });

  test('page size is bounded', async () => {
    const token = await createTestUserAndGetToken();
    const res = await request(app).get('/api/v1/tasks?limit=100000').set(auth(token));
    expect(res.body.limit).toBe(100);
  });
});

describe('injection-looking input is stored as plain data', () => {
  test("SQL-looking title is saved literally and does not leak other users' tasks", async () => {
    const other = await createTestUserAndGetToken();
    await createTask(other, 'Someone else');
    const token = await createTestUserAndGetToken();
    const payload = "' OR '1'='1";

    const created = await request(app).post('/api/v1/tasks').set(auth(token)).send({ title: payload });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe(payload);

    const list = await request(app).get('/api/v1/tasks').set(auth(token));
    expect(list.body.items.map((t) => t.title)).toEqual([payload]);

    const { rows } = await pool.query('SELECT count(*)::int AS n FROM tasks');
    expect(rows[0].n).toBe(2); // ninguna tabla alterada/borrada
  });

  test('markup-like title is returned as the same text, as JSON (not HTML)', async () => {
    const token = await createTestUserAndGetToken();
    const payload = '<script>alert(1)</script>';
    const res = await request(app).post('/api/v1/tasks').set(auth(token)).send({ title: payload });
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.body.title).toBe(payload);
  });
});

describe('authentication: tokens', () => {
  test('malformed and wrongly-signed tokens are rejected', async () => {
    const forged = jwt.sign({ sub: '00000000-0000-4000-8000-000000000000', tv: 0 }, 'wrong-secret');
    for (const header of ['Bearer', 'Bearer abc.def.ghi', `Bearer ${forged}`, 'Basic dXNlcjpwYXNz']) {
      const res = await request(app).get('/api/v1/tasks').set('Authorization', header);
      expect(res.status).toBe(401);
    }
  });

  test('"alg: none" token is rejected', async () => {
    const user = await createTestUser();
    const { sub, tv } = jwt.decode(user.accessToken);
    const none = jwt.sign({ sub, tv }, '', { algorithm: 'none' });
    expect((await request(app).get('/api/v1/tasks').set(auth(none))).status).toBe(401);
  });

  test('expired access token is rejected', async () => {
    const user = await createTestUser();
    const { sub, tv } = jwt.decode(user.accessToken);
    const expired = jwt.sign({ sub, tv, exp: Math.floor(Date.now() / 1000) - 60 }, config.jwtSecret);
    expect((await request(app).get('/api/v1/tasks').set(auth(expired))).status).toBe(401);
  });

  test('login error does not reveal whether the email exists', async () => {
    const user = await createTestUser();
    const wrongPass = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: 'not-the-password' });
    const noUser = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.test', password: TEST_PASSWORD });
    expect(wrongPass.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPass.body).toEqual(noUser.body);
  });
});

describe('refresh rotation, reuse detection, logout and logout-all', () => {
  const refresh = (token) => request(app).post('/api/v1/auth/refresh').send({ refreshToken: token });

  test('refresh rotates: new pair issued, old refresh token no longer works', async () => {
    const user = await createTestUser();
    const first = await refresh(user.refreshToken);
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(user.refreshToken);
    expect((await request(app).get('/api/v1/tasks').set(auth(first.body.accessToken))).status).toBe(200);
  });

  test('reusing an old refresh token revokes the whole family', async () => {
    const user = await createTestUser();
    const rotated = await refresh(user.refreshToken); // R1 -> R2
    expect(rotated.status).toBe(200);

    const reuse = await refresh(user.refreshToken); // R1 otra vez: ¡robo!
    expect(reuse.status).toBe(401);

    // R2 (legítimo hasta ahora) también queda revocado.
    expect((await refresh(rotated.body.refreshToken)).status).toBe(401);
  });

  test('logout revokes the refresh token of that session only', async () => {
    const user = await createTestUser();
    const secondDevice = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: TEST_PASSWORD });

    await request(app).post('/api/v1/auth/logout').send({ refreshToken: user.refreshToken }).expect(204);

    expect((await refresh(user.refreshToken)).status).toBe(401);
    expect((await refresh(secondDevice.body.refreshToken)).status).toBe(200);
  });

  test('logout-all revokes every refresh token AND current access tokens', async () => {
    const user = await createTestUser();
    const second = await request(app).post('/api/v1/auth/login').send({ email: user.email, password: TEST_PASSWORD });

    await request(app).post('/api/v1/auth/logout-all').set(auth(user.accessToken)).expect(204);

    expect((await refresh(user.refreshToken)).status).toBe(401);
    expect((await refresh(second.body.refreshToken)).status).toBe(401);
    expect((await request(app).get('/api/v1/tasks').set(auth(user.accessToken))).status).toBe(401);
    expect((await request(app).get('/api/v1/tasks').set(auth(second.body.accessToken))).status).toBe(401);
  });

  test('garbage refresh token -> 401', async () => {
    expect((await refresh('not-a-real-token')).status).toBe(401);
    expect((await refresh(undefined)).status).toBe(401);
  });
});

describe('rate limiting on login (small, authorized local run)', () => {
  test('returns 429 with a safe message after the limit', async () => {
    const limited = createApp({ authRateLimit: { windowMs: 60_000, max: 3 } });
    const attempt = () =>
      request(limited).post('/api/v1/auth/login').send({ email: 'nobody@example.test', password: 'wrong-pass-123' });

    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({ error: 'Too many attempts. Try again later.' });
    expect(blocked.headers).toHaveProperty('ratelimit');
  });
});

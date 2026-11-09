'use strict';

// Sección 6 – Pruebas de API e integración (Supertest + PostgreSQL de pruebas).
const request = require('supertest');
const { pool, resetTestDatabase } = require('../../src/db');
const { app, createTestUserAndGetToken, createTask } = require('../helpers');

beforeEach(() => resetTestDatabase());
afterAll(() => pool.end());

const auth = (token) => ({ Authorization: `Bearer ${token}` });
const UNKNOWN_UUID = '00000000-0000-4000-8000-000000000000';

describe('task API security (tutorial)', () => {
  test('rejects task creation without authentication', async () => {
    const response = await request(app).post('/api/v1/tasks').send({ title: 'Plan tests' });
    expect(response.status).toBe(401);
  });

  test('rejects an empty title', async () => {
    const token = await createTestUserAndGetToken();
    const response = await request(app).post('/api/v1/tasks').set(auth(token)).send({ title: '   ' });
    expect(response.status).toBe(400);
  });

  test('does not let one user read another user task', async () => {
    const owner = await createTestUserAndGetToken();
    const stranger = await createTestUserAndGetToken();
    const taskId = await createTask(owner, 'Private task');

    const response = await request(app).get(`/api/v1/tasks/${taskId}`).set(auth(stranger));
    expect([403, 404]).toContain(response.status);
  });
});

describe('EJERCICIO 6', () => {
  test.each([
    ['not a UUID', 'task-1'],
    ['SQL-looking', "1' OR '1'='1"],
    ['numeric', '12345'],
  ])('invalid task id (%s) returns 400 on GET, PATCH and DELETE', async (_label, badId) => {
    const token = await createTestUserAndGetToken();
    const path = `/api/v1/tasks/${encodeURIComponent(badId)}`;

    expect((await request(app).get(path).set(auth(token))).status).toBe(400);
    expect((await request(app).patch(path).set(auth(token)).send({ title: 'x' })).status).toBe(400);
    expect((await request(app).delete(path).set(auth(token))).status).toBe(400);
  });

  test('well-formed but unknown task id returns 404', async () => {
    const token = await createTestUserAndGetToken();
    const res = await request(app).get(`/api/v1/tasks/${UNKNOWN_UUID}`).set(auth(token));
    expect(res.status).toBe(404);
  });

  test('missing title returns 400 and creates nothing', async () => {
    const token = await createTestUserAndGetToken();

    const res = await request(app).post('/api/v1/tasks').set(auth(token)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Enter a valid title.');

    const list = await request(app).get('/api/v1/tasks').set(auth(token));
    expect(list.body.items).toHaveLength(0);
  });

  // Añadida tras el ejercicio 14: con la validación rota, la BD (VARCHAR(120))
  // respondía 500. La API debe responder 400 con mensaje claro.
  test('121-character title returns 400, not a 500 from the database', async () => {
    const token = await createTestUserAndGetToken();
    const res = await request(app).post('/api/v1/tasks').set(auth(token)).send({ title: 'a'.repeat(121) });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Enter a valid title.');
  });

  test('a user cannot update another user task (and the task is unchanged)', async () => {
    const owner = await createTestUserAndGetToken();
    const stranger = await createTestUserAndGetToken();
    const taskId = await createTask(owner, 'Original title');

    const res = await request(app)
      .patch(`/api/v1/tasks/${taskId}`)
      .set(auth(stranger))
      .send({ title: 'Hacked', completed: true });

    expect(res.status).toBe(404);
    // Mismo cuerpo que una tarea inexistente: no revela que existe.
    const unknown = await request(app).patch(`/api/v1/tasks/${UNKNOWN_UUID}`).set(auth(stranger)).send({ title: 'x' });
    expect(res.body).toEqual(unknown.body);

    const ownerView = await request(app).get(`/api/v1/tasks/${taskId}`).set(auth(owner));
    expect(ownerView.body).toMatchObject({ title: 'Original title', completed: false });
  });

  test('a user cannot delete another user task', async () => {
    const owner = await createTestUserAndGetToken();
    const stranger = await createTestUserAndGetToken();
    const taskId = await createTask(owner, 'Keep me');

    expect((await request(app).delete(`/api/v1/tasks/${taskId}`).set(auth(stranger))).status).toBe(404);
    expect((await request(app).get(`/api/v1/tasks/${taskId}`).set(auth(owner))).status).toBe(200);
  });

  test('list only returns the caller own tasks', async () => {
    const a = await createTestUserAndGetToken();
    const b = await createTestUserAndGetToken();
    await createTask(a, 'A1');
    await createTask(b, 'B1');

    const res = await request(app).get('/api/v1/tasks').set(auth(a));
    expect(res.body.items.map((t) => t.title)).toEqual(['A1']);
  });
});

// Regresión del bug del ejercicio 2: una tarea completada NO debe desaparecer.
describe('regression: completed tasks stay in the list (BUG-TM-042)', () => {
  test('marking a task complete keeps it in the list with completed=true', async () => {
    const token = await createTestUserAndGetToken();
    const id = await createTask(token, 'Comprar café');

    const patch = await request(app).patch(`/api/v1/tasks/${id}`).set(auth(token)).send({ completed: true });
    expect(patch.status).toBe(200);

    const list = await request(app).get('/api/v1/tasks').set(auth(token));
    expect(list.body.items).toEqual([expect.objectContaining({ id, completed: true })]);
  });
});

'use strict';

// Sección 15 – El MISMO cliente, ahora contra la API real y PostgreSQL de pruebas.
const { pool, resetTestDatabase } = require('../../src/db');
const { TaskClient } = require('../../src/client/taskClient');
const { app, createTestUser } = require('../helpers');

let server;
let baseUrl;

beforeAll(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => resetTestDatabase());
afterAll(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
});

describe('TaskClient (real API + test database)', () => {
  test('create then list round-trips through HTTP, auth middleware and SQL', async () => {
    const user = await createTestUser();
    const client = new TaskClient(baseUrl, () => user.accessToken);

    await client.createTask('  Integración real  ');
    const tasks = await client.listTasks();

    // El mock no puede detectar esto: el servidor recorta el título.
    expect(tasks).toEqual([{ id: expect.any(String), title: 'Integración real', completed: false }]);
  });

  test('server-side validation surfaces as a client error', async () => {
    const user = await createTestUser();
    const client = new TaskClient(baseUrl, () => user.accessToken);
    await expect(client.createTask('   ')).rejects.toThrow('Enter a valid title.');
  });

  test('an invalid token really yields "session expired"', async () => {
    const client = new TaskClient(baseUrl, () => 'invalid');
    await expect(client.listTasks()).rejects.toThrow('Session expired.');
  });
});

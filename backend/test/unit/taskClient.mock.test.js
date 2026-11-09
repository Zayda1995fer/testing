'use strict';

// Sección 15 – Prueba del cliente con MOCK de fetch (rápida y determinista).
// Compárala con test/integration/taskClient.integration.test.js.
const { TaskClient } = require('../../src/client/taskClient');

const jsonResponse = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

describe('TaskClient (mocked fetch)', () => {
  test('sends the bearer token and maps the task list', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, { items: [{ id: '1', title: 'Plan tests', completed: false, extra: 'x' }] }),
    );
    const client = new TaskClient('http://api.test/', () => 'TEST_TOKEN', fetchMock);

    const tasks = await client.listTasks();

    expect(tasks).toEqual([{ id: '1', title: 'Plan tests', completed: false }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith('http://api.test/api/v1/tasks', {
      headers: { Authorization: 'Bearer TEST_TOKEN' },
    });
  });

  test('maps 401 to a "session expired" error', async () => {
    const client = new TaskClient('http://api.test', () => 't', jest.fn().mockResolvedValue(jsonResponse(401, {})));
    await expect(client.listTasks()).rejects.toThrow('Session expired.');
  });

  test('maps a 500 to a safe message', async () => {
    const client = new TaskClient('http://api.test', () => 't', jest.fn().mockResolvedValue(jsonResponse(500, {})));
    await expect(client.listTasks()).rejects.toThrow('Could not load tasks.');
  });

  test('rejects a malformed body instead of crashing', async () => {
    const client = new TaskClient('http://api.test', () => 't', jest.fn().mockResolvedValue(jsonResponse(200, { nope: 1 })));
    await expect(client.listTasks()).rejects.toThrow('Could not load tasks.');
  });

  test('propagates network failures', async () => {
    const client = new TaskClient('http://api.test', () => 't', jest.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(client.listTasks()).rejects.toThrow('fetch failed');
  });
});

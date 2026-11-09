'use strict';

/**
 * Cliente HTTP mínimo de la API de tareas (usado en el ejercicio 15 para
 * comparar una prueba con mock vs. una prueba de integración real).
 */
class TaskClient {
  /**
   * @param {string} baseUrl - p. ej. http://localhost:3000
   * @param {() => string} getToken - devuelve el access token actual
   * @param {typeof fetch} [fetchImpl] - inyectable para pruebas
   */
  constructor(baseUrl, getToken, fetchImpl = globalThis.fetch) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.getToken = getToken;
    this.fetch = fetchImpl;
  }

  async listTasks() {
    const res = await this.fetch(`${this.baseUrl}/api/v1/tasks`, {
      headers: { Authorization: `Bearer ${this.getToken()}` },
    });
    if (res.status === 401) throw new Error('Session expired.');
    if (!res.ok) throw new Error('Could not load tasks.');
    const body = await res.json();
    if (!Array.isArray(body?.items)) throw new Error('Could not load tasks.');
    return body.items.map((t) => ({ id: t.id, title: t.title, completed: t.completed }));
  }

  async createTask(title) {
    const res = await this.fetch(`${this.baseUrl}/api/v1/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title }),
    });
    if (res.status === 400) throw new Error('Enter a valid title.');
    if (!res.ok) throw new Error('Could not save the task.');
    return res.json();
  }
}

module.exports = { TaskClient };

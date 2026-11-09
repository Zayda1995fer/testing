// Extra: lectura autenticada de la lista (toca JWT + PostgreSQL).
// Crea un usuario sintético en setup(). SOLO contra un entorno propio.
// Uso: BASE_URL=http://localhost:3000 k6 run k6/tasks-list-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:list}': ['p(95)<300'],
  },
};

const json = { headers: { 'Content-Type': 'application/json' } };

export function setup() {
  const email = `k6-${Date.now()}@example.test`;
  const password = 'local-test-password';
  http.post(`${__ENV.BASE_URL}/api/v1/auth/register`, JSON.stringify({ email, password }), json);
  const login = http.post(`${__ENV.BASE_URL}/api/v1/auth/login`, JSON.stringify({ email, password }), json);
  const token = login.json('accessToken');
  for (let i = 0; i < 20; i += 1) {
    http.post(`${__ENV.BASE_URL}/api/v1/tasks`, JSON.stringify({ title: `k6 task ${i}` }), {
      headers: { ...json.headers, Authorization: `Bearer ${token}` },
    });
  }
  return { token };
}

export default function (data) {
  const res = http.get(`${__ENV.BASE_URL}/api/v1/tasks`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { name: 'list' },
  });
  check(res, {
    'list returns 200': (r) => r.status === 200,
    'list has 20 items': (r) => r.json('items').length === 20,
  });
  sleep(1);
}

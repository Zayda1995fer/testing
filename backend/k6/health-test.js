// Sección 10 – Health check bajo carga ligera. SOLO contra un entorno propio.
// Uso: BASE_URL=http://localhost:3000 k6 run k6/health-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

const P95_MS = Number(__ENV.P95_MS || 500); // umbral configurable (ejercicio 10)

export const options = {
  vus: 5,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: [`p(95)<${P95_MS}`],
  },
};

export default function () {
  const response = http.get(`${__ENV.BASE_URL}/health`);

  check(response, {
    'health returns 200': (r) => r.status === 200,
  });

  sleep(1);
}

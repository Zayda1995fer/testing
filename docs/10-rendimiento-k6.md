# Ejercicio 10 – Health check con k6 en la API local

**Autorización y alcance:** sistema propio (API en `localhost:3000`, BD `taskmanager_dev`).
**Carga:** 5 usuarios virtuales (VUs) durante 30 s, 1 petición por VU por segundo.
**Condición de parada:** errores > 1 % o p95 por encima del umbral → k6 marca fallo (código de salida 99).
**Herramienta:** k6 v0.54.0 · Script: `backend/k6/health-test.js` · Salidas completas en `evidencia/ej10-*.txt`.

## Corrida 1 – umbral original `p(95) < 500 ms`

| Métrica | Valor |
|---|---|
| Peticiones | 150 (≈ 5/s) |
| Check *health returns 200* | 100 % (150/150) |
| `http_req_failed` | 0.00 % ✓ (umbral < 1 %) |
| `http_req_duration` mediana / p90 / **p95** / máx | 1.08 ms / 2.07 ms / **2.56 ms** / 4.64 ms ✓ |
| Resultado | **PASA** (exit 0) |

## Corrida 2 – un umbral cambiado: `p(95) < 1 ms`

Se ejecutó con `P95_MS=1` (solo cambia ese umbral).

| Métrica | Valor |
|---|---|
| Peticiones / checks | 150 · 100 % OK |
| `http_req_failed` | 0.00 % ✓ |
| `http_req_duration` **p95** | **2.94 ms** ✗ (umbral < 1 ms) |
| Resultado | **FALLA** – `thresholds on metrics 'http_req_duration' have been crossed` (exit 99) |

## Qué dice el reporte

- **El servicio funcionó perfectamente en ambas corridas:** todas las respuestas fueron 200 y no hubo
  errores. Lo que cambió no fue el sistema, sino la **expectativa**.
- En la corrida 2, el 95 % de las peticiones tardó hasta ~2.9 ms. Eso es más que 1 ms, así que k6
  marca el umbral como roto y sale con código ≠ 0; en un pipeline de CI eso haría fallar el paso.
- La lección: un umbral es un **acuerdo de nivel de servicio**, no una medida absoluta. Un umbral demasiado
  estricto crea falsas alarmas; uno demasiado laxo (500 ms para un `/health` de 2 ms) no detectaría una
  regresión de 100×. Para este endpoint, un valor razonable sería algo como `p(95) < 50 ms`.
- La variación entre corridas (p95 2.56 → 2.94 ms) es ruido normal en una máquina local, una razón
  más para no poner umbrales al límite de lo medido.
- `/health` no toca la BD, así que mide poco del sistema real.

## Extra – lectura autenticada de la lista (JWT + PostgreSQL)

`backend/k6/tasks-list-test.js` (usuario sintético con 20 tareas, 5 VUs × 30 s):

| Métrica | Valor |
|---|---|
| Checks (*200* y *20 items*) | 100 % (300/300) |
| `http_req_failed` | 0.00 % |
| p95 del `GET /tasks` | **6.61 ms** ✓ (umbral < 300 ms) |
| máx | 14.91 ms |

Es ~2.5× más lento que `/health` en p95, como era de esperar: verifica el JWT, consulta `users`
(token_version) y luego `tasks`. No se midieron CPU, memoria ni conexiones a BD (el entorno local no
tenía monitoreo); en un entorno dedicado habría que observarlos durante la corrida.

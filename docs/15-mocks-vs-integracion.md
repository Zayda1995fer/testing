# Ejercicio 15 – Prueba con mock vs. prueba de integración

Se probó **el mismo cliente** (`backend/src/client/taskClient.js`) de dos formas:

| | Con mock | Integración |
|---|---|---|
| Archivo | `test/unit/taskClient.mock.test.js` | `test/integration/taskClient.integration.test.js` |
| Dependencia | `fetch` reemplazado por `jest.fn()` | Servidor Express real en un puerto libre + PostgreSQL `taskmanager_test` |
| Pruebas | 5 | 3 |
| Tiempo medido | ~6 ms las 5 pruebas | ~400 ms las 3 pruebas (registro, bcrypt, HTTP, SQL) |
| Determinista | Totalmente | Sí, gracias al reset de BD antes de cada prueba |

(La app Flutter tiene el equivalente con `MockClient` en `mobile/test/api_client_test.dart`.)

## Qué detecta cada una

| Situación | Mock | Integración |
|---|---|---|
| El cliente manda la cabecera `Authorization: Bearer …` correcta | ✅ (verifica la llamada exacta) | Implícito |
| Mapear 401 → *Session expired.* | ✅ | ✅ (con un 401 real) |
| Mapear 500 → mensaje seguro | ✅ fácil de simular | ❌ difícil provocar un 500 real |
| Cuerpo con forma inesperada (`{nope:1}`) | ✅ | ❌ el servidor real nunca lo envía |
| Fallo de red (`fetch failed`) | ✅ | ❌ (habría que apagar el servidor) |
| El servidor **recorta** el título (`'  Integración real  '` → `'Integración real'`) | ❌ el mock devuelve lo que yo le diga | ✅ |
| La ruta real es `/api/v1/tasks` y no `/tasks` | ❌ el mock acepta cualquier URL que yo espere | ✅ |
| El JSON que manda el cliente pasa la validación del servidor | ❌ | ✅ |
| Middleware de autenticación + SQL + ownership funcionan juntos | ❌ | ✅ |
| El contrato cambió en el servidor (p. ej. `items` → `tasks`) | ❌ **sigue en verde** con datos viejos | ✅ falla |

## Conclusión

- El **mock** es ideal para los caminos de error raros (500, red caída, datos corruptos), que
  son difíciles de provocar de verdad, y para verificar *cómo* el cliente llama a la API.
- La **integración** es la única que prueba que cliente y servidor están de acuerdo en el contrato.
  Un mock solo refleja lo que *creo* que hace el servidor.
- Regla del tutorial aplicada: **no se usa mock en lo que se quiere verificar.** Las pruebas de
  ownership (`tasks.api.test.js`, `security.test.js`) siempre usan la BD real con dos usuarios.

## Prueba inestable (flaky) encontrada y corregida

Al primer `npm test`, 6 pruebas de `security.test.js` fallaban con **429 Too Many Requests**.

- **Causa:** todas las pruebas del archivo comparten la misma instancia de la app y, por tanto, el
  mismo contador del rate limiter (20 logins/min). Cada `createTestUser()` hace un login; a partir
  del vigésimo, el resto fallaba. El resultado dependía del **orden** y la **cantidad** de pruebas.
- **Mala solución:** volver a ejecutar hasta que pase, o subir el timeout.
- **Solución aplicada:** controlar el estado compartido. `test/setupEnv.js` sube el límite para la
  app compartida, y la prueba de rate limit crea **su propia instancia** con `createApp({ authRateLimit: { max: 3 } })`.
  Así esa prueba es determinista y las demás no dependen unas de otras.

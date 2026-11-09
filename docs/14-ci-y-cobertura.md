# Ejercicio 14 – CI: comprobar que el pipeline falla cuando el comportamiento se rompe

**Workflow:** `.github/workflows/tests.yml` – dos jobs:
- `backend`: levanta un servicio **PostgreSQL 16** solo para pruebas, `npm ci`, `npm run test:coverage`.
- `flutter`: `flutter pub get`, `flutter analyze`, `flutter test`.

(Respecto a la plantilla del tutorial se añadió el servicio de Postgres, porque las pruebas de API
necesitan una BD aislada, y `flutter analyze`.)

## La prueba añadida

`backend/test/integration/tasks.api.test.js` › **121-character title returns 400, not a 500 from the database**

## Experimento: romper el código a propósito

Se ejecutó localmente el mismo comando que corre CI (`npm test`). Evidencia: `evidencia/ej14-*.txt`.

| Paso | Cambio | Resultado |
|---|---|---|
| 1. Línea base | — | **79/79** ✅ |
| 2. Romper | `TITLE_MAX = 120` → `200` en `src/tasks/validation.js` | **3 fallos**, 76 OK ❌ → el job de CI quedaría en rojo y bloquearía el merge |
| 3. Restaurar | volver a `120` | **79/79** ✅ |

Pruebas que detectaron la rotura:
1. `validateTitle › rejects a title longer than the limit` (unitaria)
2. `title partitions and boundaries (1..120) › just over maximum` (unitaria)
3. `EJERCICIO 6 › 121-character title returns 400, not a 500` (API) → **esperado 400, recibido 500**

## Lo que enseñó el experimento

En el primer intento (antes de añadir la prueba de API) **solo fallaban las 2 unitarias**. Ninguna
prueba de API enviaba 121 caracteres, así que no se veía que, con la validación rota, la columna
`VARCHAR(120)` de PostgreSQL hacía fallar el `INSERT` y el usuario recibía un **500** genérico.
Por eso se añadió la prueba de API: comprueba el contrato que ve el cliente, no solo la función.

## Cobertura (`npm run test:coverage`)

| | Sentencias | Ramas | Funciones | Líneas |
|---|---|---|---|---|
| Total | 90.4 % | 89.4 % | 94.6 % | 92.0 % |

Lo que **no** dice ese 90 %:
- La línea `if (title.length > TITLE_MAX)` estaba "cubierta" al 100 % desde el principio, y aun así
  faltaba la prueba de que la **API** responde 400 en ese caso: la cobertura mide qué código se ejecutó,
  no qué comportamiento se verificó.
- Los bugs de la sesión exploratoria (caracteres invisibles, emoji, duplicados) están en código con
  100 % de cobertura.
- Las líneas sin cubrir son sobre todo ramas `catch → next(err)` de errores de BD; probarlas exigiría
  simular la caída de PostgreSQL (candidato a una prueba con mock del `pool`).

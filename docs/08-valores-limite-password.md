# Ejercicio 8 – Valores límite y particiones: campo contraseña

## Regla supuesta (documentada en `backend/src/auth/validation.js`)

- Mínimo **8** caracteres.
- Máximo **72 bytes** en UTF-8. Es el límite real de bcrypt: lo que pase de 72 bytes se ignoraría
  en silencio, así que es más seguro rechazarlo que truncar.
- No puede ser solo espacios. La contraseña **no se recorta** (los espacios cuentan).
- Debe ser texto (string).

Ninguno de los valores usados es una contraseña real; todos son cadenas sintéticas.

## Tabla de particiones y límites

| Partición o límite | Entrada de ejemplo | Esperado | Resultado |
|---|---|---|---|
| Vacía | `""` | Rechazar | ✅ |
| Solo espacios | 8 espacios | Rechazar | ✅ |
| Justo debajo del mínimo | 7 × `x` | Rechazar | ✅ |
| **Mínimo válido** | 8 × `x` | Aceptar | ✅ |
| Valor típico | `synthetic-Pass-2026` | Aceptar | ✅ |
| **Máximo válido** | 72 × `x` (72 bytes) | Aceptar | ✅ |
| Justo encima del máximo | 73 × `x` | Rechazar | ✅ |
| Multibyte en el límite | 24 × `€` (3 bytes c/u = 72 bytes) | Aceptar | ✅ |
| Multibyte sobre el límite | 25 × `€` (75 bytes, solo 25 caracteres) | Rechazar | ✅ |
| Tipo incorrecto | `12345678` (número) | Rechazar | ✅ |
| Tipo incorrecto | `null` | Rechazar | ✅ |
| Espacios significativos | `"  padded-pass  "` | Aceptar sin recortar | ✅ |

Pruebas automatizadas: `backend/test/unit/boundaries.test.js` › *password partitions and boundaries* (12 casos, todos en verde).

## Observaciones

- El caso multibyte muestra por qué el límite debe definirse en **bytes** para bcrypt: 25 `€` son
  solo 25 caracteres, pero 75 bytes.
- A nivel de API, `/auth/register` responde **400** con el mensaje de la regla; `/auth/login` nunca
  dice qué regla falló (siempre *Invalid email or password.*), para no ayudar a un atacante.

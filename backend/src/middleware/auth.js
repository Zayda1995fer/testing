'use strict';

const { pool } = require('../db');
const { verifyAccessToken } = require('../auth/tokens');

/**
 * Exige `Authorization: Bearer <token>`. Rechaza tokens inválidos, expirados
 * o revocados (token_version distinto tras logout-all) con 401 genérico.
 */
async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  let claims;
  try {
    claims = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const { rows } = await pool.query('SELECT id, token_version FROM users WHERE id = $1', [
      claims.sub,
    ]);
    if (!rows[0] || rows[0].token_version !== claims.tv) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    req.user = { id: rows[0].id };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAuth };

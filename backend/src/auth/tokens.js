'use strict';

const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { config } = require('../config');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

/**
 * Firma un access token corto. `tv` (token version) permite invalidar todos
 * los access tokens de un usuario con logout-all.
 */
function signAccessToken(user) {
  return jwt.sign({ sub: user.id, tv: user.token_version }, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.accessTokenTtlSeconds,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

/**
 * Emite un refresh token opaco (aleatorio). En BD solo se guarda su hash.
 * @param {string} userId
 * @param {string} [familyId] - Familia de rotación; nueva en cada login.
 */
async function issueRefreshToken(userId, familyId = crypto.randomUUID(), client = pool) {
  const token = crypto.randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + config.refreshTokenTtlSeconds * 1000);
  await client.query(
    `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [userId, familyId, sha256(token), expiresAt],
  );
  return token;
}

/**
 * Rotación con detección de reutilización:
 *  - token válido y no usado  -> se marca usado y se emite uno nuevo (misma familia)
 *  - token YA usado           -> posible robo: se revoca TODA la familia
 *  - revocado/expirado/desconocido -> null
 *
 * @returns {Promise<{user: object, refreshToken: string} | null>}
 */
async function rotateRefreshToken(rawToken) {
  if (typeof rawToken !== 'string' || rawToken.length === 0) return null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `SELECT rt.*, u.token_version, u.email
         FROM refresh_tokens rt JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = $1
        FOR UPDATE OF rt`,
      [sha256(rawToken)],
    );
    const record = rows[0];

    if (!record || record.revoked_at || record.expires_at < new Date()) {
      await client.query('ROLLBACK');
      return null;
    }

    if (record.used_at) {
      // Reutilización detectada: revocar la familia entera.
      await client.query(
        'UPDATE refresh_tokens SET revoked_at = now() WHERE family_id = $1 AND revoked_at IS NULL',
        [record.family_id],
      );
      await client.query('COMMIT');
      return null;
    }

    await client.query('UPDATE refresh_tokens SET used_at = now() WHERE id = $1', [record.id]);
    const refreshToken = await issueRefreshToken(record.user_id, record.family_id, client);
    await client.query('COMMIT');

    return {
      user: { id: record.user_id, email: record.email, token_version: record.token_version },
      refreshToken,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Revoca la familia del refresh token indicado (logout de un dispositivo). */
async function revokeFamilyOf(rawToken) {
  if (typeof rawToken !== 'string' || rawToken.length === 0) return;
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now()
      WHERE family_id = (SELECT family_id FROM refresh_tokens WHERE token_hash = $1)
        AND revoked_at IS NULL`,
    [sha256(rawToken)],
  );
}

/** Logout-all: revoca todos los refresh tokens e invalida los access tokens. */
async function revokeAllForUser(userId) {
  await pool.query(
    'UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL',
    [userId],
  );
  await pool.query('UPDATE users SET token_version = token_version + 1 WHERE id = $1', [userId]);
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeFamilyOf,
  revokeAllForUser,
};

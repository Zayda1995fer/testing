'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { pool } = require('../db');
const { validateEmail, validatePassword } = require('./validation');
const {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeFamilyOf,
  revokeAllForUser,
} = require('./tokens');
const { requireAuth } = require('../middleware/auth');

// Hash ficticio para que login con email inexistente tarde lo mismo (evita
// enumeración de usuarios por tiempo de respuesta).
const DUMMY_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

/**
 * @param {{windowMs: number, max: number}} limits - Límite para login/refresh.
 */
function createAuthRouter(limits) {
  const router = express.Router();

  const sensitiveFlowLimiter = rateLimit({
    windowMs: limits.windowMs,
    limit: limits.max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many attempts. Try again later.' },
  });

  router.post('/register', async (req, res, next) => {
    let email;
    let password;
    try {
      email = validateEmail(req.body?.email);
      password = validatePassword(req.body?.password);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      const hash = await bcrypt.hash(password, 10);
      const { rows } = await pool.query(
        `INSERT INTO users (email, password_hash) VALUES ($1, $2)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email`,
        [email, hash],
      );
      if (!rows[0]) return res.status(409).json({ error: 'Could not register with that email.' });
      return res.status(201).json({ id: rows[0].id, email: rows[0].email });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/login', sensitiveFlowLimiter, async (req, res, next) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    try {
      const { rows } = await pool.query(
        'SELECT id, email, password_hash, token_version FROM users WHERE email = $1',
        [email],
      );
      const user = rows[0];
      const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
      if (!user || !ok) return res.status(401).json({ error: 'Invalid email or password.' });

      const refreshToken = await issueRefreshToken(user.id);
      return res.json({ accessToken: signAccessToken(user), refreshToken });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/refresh', sensitiveFlowLimiter, async (req, res, next) => {
    try {
      const result = await rotateRefreshToken(req.body?.refreshToken);
      if (!result) return res.status(401).json({ error: 'Invalid refresh token.' });
      return res.json({
        accessToken: signAccessToken(result.user),
        refreshToken: result.refreshToken,
      });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/logout', async (req, res, next) => {
    try {
      await revokeFamilyOf(req.body?.refreshToken);
      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  });

  router.post('/logout-all', requireAuth, async (req, res, next) => {
    try {
      await revokeAllForUser(req.user.id);
      return res.status(204).end();
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { createAuthRouter };

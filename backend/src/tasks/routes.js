'use strict';

const express = require('express');
const { pool } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { validateTitle, validateTaskId, validateCompleted } = require('./validation');

const MAX_PAGE_SIZE = 100;

/** Solo estos campos se exponen; nunca se acepta owner_id desde el cliente. */
const toDto = (row) => ({
  id: row.id,
  title: row.title,
  completed: row.completed,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Misma respuesta para "no existe" y "es de otro usuario": no revela existencia.
const notFound = (res) => res.status(404).json({ error: 'Task not found.' });

function createTasksRouter() {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', async (req, res, next) => {
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 1), MAX_PAGE_SIZE);
    const offset = Math.max(Number.parseInt(req.query.offset, 10) || 0, 0);
    try {
      const { rows } = await pool.query(
        `SELECT * FROM tasks WHERE owner_id = $1
         ORDER BY created_at DESC, id LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset],
      );
      return res.json({ items: rows.map(toDto), limit, offset });
    } catch (err) {
      return next(err);
    }
  });

  router.post('/', async (req, res, next) => {
    let title;
    try {
      title = validateTitle(req.body?.title);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      // owner_id SIEMPRE sale del token, nunca del body (mass assignment).
      const { rows } = await pool.query(
        'INSERT INTO tasks (owner_id, title) VALUES ($1, $2) RETURNING *',
        [req.user.id, title],
      );
      return res.status(201).json(toDto(rows[0]));
    } catch (err) {
      return next(err);
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      validateTaskId(req.params.id);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      const { rows } = await pool.query('SELECT * FROM tasks WHERE id = $1 AND owner_id = $2', [
        req.params.id,
        req.user.id,
      ]);
      return rows[0] ? res.json(toDto(rows[0])) : notFound(res);
    } catch (err) {
      return next(err);
    }
  });

  router.patch('/:id', async (req, res, next) => {
    const updates = {};
    try {
      validateTaskId(req.params.id);
      // Lista blanca: cualquier otro campo (ownerId, owner_id, id, createdAt...) se ignora.
      if (req.body?.title !== undefined) updates.title = validateTitle(req.body.title);
      if (req.body?.completed !== undefined) {
        updates.completed = validateCompleted(req.body.completed);
      }
      if (Object.keys(updates).length === 0) throw new TypeError('Nothing to update.');
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      const { rows } = await pool.query(
        `UPDATE tasks
            SET title = COALESCE($3, title),
                completed = COALESCE($4, completed),
                updated_at = now()
          WHERE id = $1 AND owner_id = $2
          RETURNING *`,
        [req.params.id, req.user.id, updates.title ?? null, updates.completed ?? null],
      );
      return rows[0] ? res.json(toDto(rows[0])) : notFound(res);
    } catch (err) {
      return next(err);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      validateTaskId(req.params.id);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    try {
      const { rowCount } = await pool.query('DELETE FROM tasks WHERE id = $1 AND owner_id = $2', [
        req.params.id,
        req.user.id,
      ]);
      return rowCount ? res.status(204).end() : notFound(res);
    } catch (err) {
      return next(err);
    }
  });

  return router;
}

module.exports = { createTasksRouter, MAX_PAGE_SIZE };

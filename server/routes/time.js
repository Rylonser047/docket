import { Router } from 'express';
import db from '../db/schema.js';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { job_id, client_id, week } = req.query;
  let query = `SELECT t.*, j.title as job_title, c.name as client_name FROM time_entries t LEFT JOIN jobs j ON t.job_id = j.id LEFT JOIN clients c ON t.client_id = c.id WHERE 1=1`;
  const params = [];
  if (job_id) { query += ' AND t.job_id = ?'; params.push(job_id); }
  if (client_id) { query += ' AND t.client_id = ?'; params.push(client_id); }
  if (week) {
    query += " AND t.start_time >= date('now', 'weekday 0', '-7 days') AND t.start_time < date('now', 'weekday 0', '+1 days')";
  }
  query += ' ORDER BY t.start_time DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', (req, res) => {
  const { job_id, client_id, description, start_time, end_time, duration_minutes, billable } = req.body;
  let dur = duration_minutes;
  if (!dur && start_time && end_time) {
    dur = Math.round((new Date(end_time) - new Date(start_time)) / 60000);
  }
  const result = db.prepare(
    'INSERT INTO time_entries (job_id, client_id, description, start_time, end_time, duration_minutes, billable) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(job_id, client_id, description, start_time, end_time, dur || 0, billable !== false ? 1 : 0);
  const entry = db.prepare('SELECT t.*, j.title as job_title, c.name as client_name FROM time_entries t LEFT JOIN jobs j ON t.job_id = j.id LEFT JOIN clients c ON t.client_id = c.id WHERE t.id = ?').get(result.lastInsertRowid);
  db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
    .run('time_logged', `${Math.round((dur || 0) / 60 * 10) / 10}h logged${description ? ': ' + description : ''}`, 'time', result.lastInsertRowid);
  res.json(entry);
});

router.put('/:id', (req, res) => {
  const { job_id, client_id, description, start_time, end_time, duration_minutes, billable } = req.body;
  let dur = duration_minutes;
  if (!dur && start_time && end_time) dur = Math.round((new Date(end_time) - new Date(start_time)) / 60000);
  db.prepare('UPDATE time_entries SET job_id=?, client_id=?, description=?, start_time=?, end_time=?, duration_minutes=?, billable=? WHERE id=?')
    .run(job_id, client_id, description, start_time, end_time, dur, billable !== false ? 1 : 0, req.params.id);
  res.json(db.prepare('SELECT * FROM time_entries WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM time_entries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import db from '../db/schema.js';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { status, client_id } = req.query;
  let query = `SELECT j.*, c.name as client_name FROM jobs j LEFT JOIN clients c ON j.client_id = c.id WHERE 1=1`;
  const params = [];
  if (status) { query += ' AND j.status = ?'; params.push(status); }
  if (client_id) { query += ' AND j.client_id = ?'; params.push(client_id); }
  query += ' ORDER BY j.created_at DESC';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req, res) => {
  const job = db.prepare(`SELECT j.*, c.name as client_name, c.email as client_email FROM jobs j LEFT JOIN clients c ON j.client_id = c.id WHERE j.id = ?`).get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  const invoices = db.prepare('SELECT * FROM invoices WHERE job_id = ?').all(job.id);
  const timeEntries = db.prepare('SELECT * FROM time_entries WHERE job_id = ?').all(job.id);
  const expenses = db.prepare('SELECT * FROM expenses WHERE job_id = ?').all(job.id);
  res.json({ ...job, invoices, timeEntries, expenses });
});

router.post('/', (req, res) => {
  const { client_id, title, description, status, hourly_rate, estimated_hours, start_date, end_date } = req.body;
  if (!title) return res.status(400).json({ error: 'title required' });
  const result = db.prepare(
    'INSERT INTO jobs (client_id, title, description, status, hourly_rate, estimated_hours, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(client_id, title, description, status || 'draft', hourly_rate || 0, estimated_hours || 0, start_date, end_date);
  const job = db.prepare('SELECT j.*, c.name as client_name FROM jobs j LEFT JOIN clients c ON j.client_id = c.id WHERE j.id = ?').get(result.lastInsertRowid);
  db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
    .run('job_created', `Job "${title}" created`, 'job', result.lastInsertRowid);
  res.json(job);
});

router.put('/:id', (req, res) => {
  const { client_id, title, description, status, hourly_rate, estimated_hours, start_date, end_date, scope_document } = req.body;
  db.prepare(
    'UPDATE jobs SET client_id=?, title=?, description=?, status=?, hourly_rate=?, estimated_hours=?, start_date=?, end_date=?, scope_document=? WHERE id=?'
  ).run(client_id, title, description, status, hourly_rate, estimated_hours, start_date, end_date, scope_document, req.params.id);
  res.json(db.prepare('SELECT j.*, c.name as client_name FROM jobs j LEFT JOIN clients c ON j.client_id = c.id WHERE j.id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

import { Router } from 'express';
import db from '../db/schema.js';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const { search } = req.query;
  let clients;
  if (search) {
    clients = db.prepare(`SELECT * FROM clients WHERE name LIKE ? OR email LIKE ? OR company LIKE ? ORDER BY name`
    ).all(`%${search}%`, `%${search}%`, `%${search}%`);
  } else {
    clients = db.prepare('SELECT * FROM clients ORDER BY name').all();
  }
  res.json(clients);
});

router.get('/:id', (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Not found' });
  const jobs = db.prepare('SELECT * FROM jobs WHERE client_id = ? ORDER BY created_at DESC').all(client.id);
  const invoices = db.prepare('SELECT * FROM invoices WHERE client_id = ? ORDER BY created_at DESC').all(client.id);
  const timeEntries = db.prepare('SELECT * FROM time_entries WHERE client_id = ? ORDER BY created_at DESC').all(client.id);
  const expenses = db.prepare('SELECT * FROM expenses WHERE client_id = ? ORDER BY date DESC').all(client.id);
  res.json({ ...client, jobs, invoices, timeEntries, expenses });
});

router.post('/', (req, res) => {
  const { name, email, phone, company, address, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const result = db.prepare(
    'INSERT INTO clients (name, email, phone, company, address, notes) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name, email, phone, company, address, notes);
  logActivity('client_added', `New client ${name} added`, 'client', result.lastInsertRowid);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { name, email, phone, company, address, notes } = req.body;
  db.prepare(
    'UPDATE clients SET name=?, email=?, phone=?, company=?, address=?, notes=? WHERE id=?'
  ).run(name, email, phone, company, address, notes, req.params.id);
  res.json(db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

function logActivity(type, message, entityType, entityId) {
  db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
    .run(type, message, entityType, entityId);
}

export default router;

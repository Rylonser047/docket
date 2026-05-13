import { Router } from 'express';
import db from '../db/schema.js';
import { requireAuth } from './auth.js';
import { sendTestimonialRequest } from '../services/email.js';
import { randomBytes } from 'crypto';
import { recalculateHealthScore } from '../services/healthScore.js';

const router = Router();

// Public routes (no auth)
router.get('/review/:token', (req, res) => {
  const t = db.prepare('SELECT t.*, c.name as client_name FROM testimonials t LEFT JOIN clients c ON t.client_id = c.id WHERE t.token = ?').get(req.params.token);
  if (!t) return res.status(404).json({ error: 'Not found' });
  res.json({ client_name: t.client_name, already_responded: !!t.responded_at });
});

router.post('/review/:token', (req, res) => {
  const t = db.prepare('SELECT * FROM testimonials WHERE token = ?').get(req.params.token);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (t.responded_at) return res.status(400).json({ error: 'Already responded' });
  const { rating, text } = req.body;
  if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'rating 1-5 required' });
  db.prepare("UPDATE testimonials SET rating=?, text=?, responded_at=datetime('now') WHERE id=?").run(rating, text, t.id);
  if (t.client_id) recalculateHealthScore(t.client_id);
  db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
    .run('testimonial_received', `New ${rating}-star testimonial received`, 'testimonial', t.id);
  res.json({ ok: true });
});

// Protected routes
router.use(requireAuth);

router.get('/', (req, res) => {
  const all = db.prepare(`SELECT t.*, c.name as client_name FROM testimonials t LEFT JOIN clients c ON t.client_id = c.id ORDER BY t.created_at DESC`).all();
  res.json(all);
});

router.get('/portfolio', (req, res) => {
  const approved = db.prepare(`SELECT t.*, c.name as client_name FROM testimonials t LEFT JOIN clients c ON t.client_id = c.id WHERE t.approved = 1 AND t.responded_at IS NOT NULL ORDER BY t.responded_at DESC`).all();
  res.json(approved);
});

router.post('/:id/approve', (req, res) => {
  db.prepare('UPDATE testimonials SET approved = 1 WHERE id = ?').run(req.params.id);
  const t = db.prepare('SELECT * FROM testimonials WHERE id = ?').get(req.params.id);
  if (t?.client_id) recalculateHealthScore(t.client_id);
  res.json({ ok: true });
});

router.post('/:id/request', async (req, res) => {
  const t = db.prepare('SELECT t.*, c.name as client_name, c.email as client_email FROM testimonials t LEFT JOIN clients c ON t.client_id = c.id WHERE t.id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
  const client = { name: t.client_name, email: t.client_email };
  try {
    await sendTestimonialRequest(client, settings, t.token, req.headers.origin || 'http://localhost:5173');
    db.prepare("UPDATE testimonials SET request_sent_at = datetime('now') WHERE id = ?").run(t.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/new', async (req, res) => {
  const { client_id, job_id } = req.body;
  const token = randomBytes(20).toString('hex');
  const result = db.prepare("INSERT INTO testimonials (client_id, job_id, token, request_sent_at) VALUES (?, ?, ?, datetime('now'))").run(client_id, job_id, token);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(client_id);
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
  if (client?.email) {
    try {
      await sendTestimonialRequest(client, settings, token, req.headers.origin || 'http://localhost:5173');
    } catch (e) { console.error('Email failed:', e.message); }
  }
  res.json({ id: result.lastInsertRowid, token });
});

export default router;

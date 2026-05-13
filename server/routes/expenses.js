import { Router } from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db/schema.js';
import { requireAuth } from './auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const upload = multer({ dest: join(__dirname, '..', 'uploads') });
const router = Router();
router.use(requireAuth);

const CATEGORIES = {
  fuel: ['fuel', 'petrol', 'diesel', 'gas', 'uber', 'travel'],
  materials: ['material', 'supplies', 'hardware', 'lumber', 'cement', 'pipe', 'wire', 'brick'],
  tools: ['tool', 'equipment', 'drill', 'saw', 'wrench', 'ladder'],
  software: ['software', 'subscription', 'saas', 'app', 'license', 'cloud'],
  meals: ['meal', 'food', 'lunch', 'dinner', 'coffee', 'restaurant', 'takeaway'],
};

function autoCategory(desc) {
  if (!desc) return 'other';
  const lower = desc.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORIES)) {
    if (words.some(w => lower.includes(w))) return cat;
  }
  return 'other';
}

router.get('/', (req, res) => {
  const { job_id, client_id, month } = req.query;
  let query = `SELECT e.*, j.title as job_title, c.name as client_name FROM expenses e LEFT JOIN jobs j ON e.job_id = j.id LEFT JOIN clients c ON e.client_id = c.id WHERE 1=1`;
  const params = [];
  if (job_id) { query += ' AND e.job_id = ?'; params.push(job_id); }
  if (client_id) { query += ' AND e.client_id = ?'; params.push(client_id); }
  if (month) { query += " AND strftime('%Y-%m', e.date) = ?"; params.push(month); }
  query += ' ORDER BY e.date DESC';
  res.json(db.prepare(query).all(...params));
});

router.post('/', upload.single('receipt'), (req, res) => {
  const { job_id, client_id, description, amount, category, date } = req.body;
  const cat = category || autoCategory(description);
  const receiptUrl = req.file ? `/uploads/${req.file.filename}` : null;
  const result = db.prepare(
    'INSERT INTO expenses (job_id, client_id, description, amount, category, receipt_image_url, date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(job_id || null, client_id || null, description, parseFloat(amount) || 0, cat, receiptUrl, date || new Date().toISOString().split('T')[0]);
  db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
    .run('expense_added', `Expense R${amount} added: ${description}`, 'expense', result.lastInsertRowid);
  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;

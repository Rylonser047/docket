import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/schema.js';

const router = Router();
const SECRET = process.env.JWT_SECRET || 'docket-secret-2024';

router.post('/login', (req, res) => {
  const { password } = req.body;
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  if (!settings || !settings.setup_complete) {
    return res.status(403).json({ error: 'Setup not complete' });
  }
  if (!bcrypt.compareSync(password, settings.password_hash)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = jwt.sign({ id: 1 }, SECRET, { expiresIn: '30d' });
  res.json({ token, settings: sanitize(settings) });
});

router.post('/setup', (req, res) => {
  const existing = db.prepare('SELECT setup_complete FROM settings WHERE id = 1').get();
  if (existing?.setup_complete) {
    return res.status(403).json({ error: 'Already set up' });
  }
  const { name, business_name, email, phone, address, bank_name, bank_account, bank_branch, vat_number, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`
    INSERT INTO settings (id, name, business_name, email, phone, address, bank_name, bank_account, bank_branch, vat_number, password_hash, setup_complete)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, business_name=excluded.business_name, email=excluded.email,
      phone=excluded.phone, address=excluded.address, bank_name=excluded.bank_name, bank_account=excluded.bank_account,
      bank_branch=excluded.bank_branch, vat_number=excluded.vat_number, password_hash=excluded.password_hash, setup_complete=1
  `).run(name, business_name, email, phone, address, bank_name, bank_account, bank_branch, vat_number, hash);
  const token = jwt.sign({ id: 1 }, SECRET, { expiresIn: '30d' });
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json({ token, settings: sanitize(settings) });
});

router.get('/me', requireAuth, (req, res) => {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(sanitize(settings));
});

router.put('/settings', requireAuth, (req, res) => {
  const { name, business_name, email, phone, address, bank_name, bank_account, bank_branch, vat_number, password } = req.body;
  const current = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const hash = password ? bcrypt.hashSync(password, 10) : current.password_hash;
  db.prepare(`
    UPDATE settings SET name=?, business_name=?, email=?, phone=?, address=?, bank_name=?, bank_account=?, bank_branch=?, vat_number=?, password_hash=? WHERE id=1
  `).run(name || current.name, business_name || current.business_name, email || current.email, phone || current.phone,
    address || current.address, bank_name || current.bank_name, bank_account || current.bank_account,
    bank_branch || current.bank_branch, vat_number || current.vat_number, hash);
  const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json(sanitize(updated));
});

router.get('/status', (req, res) => {
  const s = db.prepare('SELECT setup_complete FROM settings WHERE id = 1').get();
  res.json({ setup_complete: !!s?.setup_complete });
});

function sanitize(s) {
  if (!s) return null;
  const { password_hash, ...rest } = s;
  return rest;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const token = header.replace('Bearer ', '');
    jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export default router;

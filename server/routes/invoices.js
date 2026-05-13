import { Router } from 'express';
import db from '../db/schema.js';
import { requireAuth } from './auth.js';
import { generateInvoicePDF } from '../services/pdf.js';
import { sendInvoiceEmail, sendTestimonialRequest } from '../services/email.js';
import { recalculateHealthScore } from '../services/healthScore.js';
import { randomBytes } from 'crypto';

const router = Router();
router.use(requireAuth);

function nextInvoiceNumber() {
  const last = db.prepare("SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1").get();
  if (!last) return 'INV-001';
  const num = parseInt(last.invoice_number.replace('INV-', ''), 10) + 1;
  return `INV-${String(num).padStart(3, '0')}`;
}

router.get('/', (req, res) => {
  const { status } = req.query;
  let query = `SELECT i.*, c.name as client_name, c.email as client_email FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE 1=1`;
  const params = [];
  if (status && status !== 'all') { query += ' AND i.status = ?'; params.push(status); }
  query += ' ORDER BY i.created_at DESC';
  const invoices = db.prepare(query).all(...params);
  res.json(invoices.map(parseLineItems));
});

router.get('/:id', (req, res) => {
  const inv = db.prepare(`SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address, c.company as client_company, c.phone as client_phone FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = ?`).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  res.json(parseLineItems(inv));
});

router.post('/', (req, res) => {
  const { job_id, client_id, line_items, vat_rate, due_date, status } = req.body;
  const items = Array.isArray(line_items) ? line_items : [];
  const vatRate = vat_rate ?? 15;
  const subtotal = items.reduce((s, i) => s + (i.quantity || 1) * (i.unitPrice || 0), 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;
  const invNum = nextInvoiceNumber();
  const dueDate = due_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const result = db.prepare(`
    INSERT INTO invoices (job_id, client_id, invoice_number, line_items, subtotal, vat_rate, vat_amount, total, status, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(job_id, client_id, invNum, JSON.stringify(items), subtotal, vatRate, vatAmount, total, status || 'draft', dueDate);

  db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
    .run('invoice_created', `Invoice ${invNum} created`, 'invoice', result.lastInsertRowid);

  res.json(parseLineItems(db.prepare('SELECT * FROM invoices WHERE id = ?').get(result.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  const { job_id, client_id, line_items, vat_rate, due_date, status } = req.body;
  const items = Array.isArray(line_items) ? line_items : JSON.parse(inv.line_items || '[]');
  const vatRate = vat_rate ?? inv.vat_rate ?? 15;
  const subtotal = items.reduce((s, i) => s + (i.quantity || 1) * (i.unitPrice || 0), 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;
  db.prepare(`UPDATE invoices SET job_id=?, client_id=?, line_items=?, subtotal=?, vat_rate=?, vat_amount=?, total=?, due_date=?, status=? WHERE id=?`)
    .run(job_id ?? inv.job_id, client_id ?? inv.client_id, JSON.stringify(items), subtotal, vatRate, vatAmount, total, due_date ?? inv.due_date, status ?? inv.status, req.params.id);
  res.json(parseLineItems(db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id)));
});

router.get('/:id/pdf', (req, res) => {
  const inv = db.prepare(`SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address, c.company as client_company, c.phone as client_phone FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = ?`).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
  const client = { name: inv.client_name, email: inv.client_email, address: inv.client_address, company: inv.client_company, phone: inv.client_phone };
  generateInvoicePDF(parseLineItems(inv), client, settings, res);
});

router.post('/:id/send', async (req, res) => {
  const inv = db.prepare(`SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address, c.company as client_company, c.phone as client_phone FROM invoices i LEFT JOIN clients c ON i.client_id = c.id WHERE i.id = ?`).get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
  const client = { name: inv.client_name, email: inv.client_email, address: inv.client_address, company: inv.client_company, phone: inv.client_phone };

  // Generate PDF buffer
  const pdfBuffer = await generatePDFBuffer(parseLineItems(inv), client, settings);

  try {
    await sendInvoiceEmail(parseLineItems(inv), client, settings, pdfBuffer);
    db.prepare("UPDATE invoices SET status='sent', sent_at=datetime('now') WHERE id=?").run(req.params.id);
    db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
      .run('invoice_sent', `Invoice ${inv.invoice_number} sent to ${inv.client_name}`, 'invoice', inv.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/paid', async (req, res) => {
  const inv = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!inv) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE invoices SET status='paid', paid_at=datetime('now') WHERE id=?").run(req.params.id);
  if (inv.client_id) recalculateHealthScore(inv.client_id);
  db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
    .run('invoice_paid', `Invoice ${inv.invoice_number} marked as paid`, 'invoice', inv.id);

  const { request_testimonial } = req.body;
  if (request_testimonial && inv.client_id) {
    const token = randomBytes(20).toString('hex');
    db.prepare('INSERT INTO testimonials (client_id, job_id, token, request_sent_at) VALUES (?, ?, ?, datetime(\'now\'))').run(inv.client_id, inv.job_id, token);
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(inv.client_id);
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};
    try {
      await sendTestimonialRequest(client, settings, token, req.headers.origin || 'http://localhost:5173');
    } catch (e) { console.error('Testimonial email failed:', e.message); }
  }

  res.json({ ok: true });
});

function parseLineItems(inv) {
  if (!inv) return inv;
  return { ...inv, line_items: typeof inv.line_items === 'string' ? JSON.parse(inv.line_items || '[]') : inv.line_items };
}

async function generatePDFBuffer(inv, client, settings) {
  const PDFDocument = (await import('pdfkit')).default;
  return new Promise((resolve, reject) => {
    const chunks = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    generateInvoicePDF(inv, client, settings, { pipe: (s) => doc.pipe(s), setHeader: () => {} });
  });
}

export default router;

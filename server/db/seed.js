import db from './schema.js';
import bcrypt from 'bcryptjs';

export function seedDemo() {
  const existing = db.prepare('SELECT COUNT(*) as count FROM clients').get();
  if (existing.count > 0) return;
  
  // Skip demo data in production
  if (process.env.NODE_ENV === 'production') return;

  // Demo settings
  const hash = bcrypt.hashSync('demo1234', 10);
  db.prepare(`
    INSERT OR IGNORE INTO settings (id, name, business_name, email, phone, address, bank_name, bank_account, bank_branch, password_hash, setup_complete)
    VALUES (1, 'Demo User', 'Demo Trades', 'demo@docket.app', '+27 82 000 0000', '1 Main Street, Cape Town', 'FNB', '62000000000', '250655', ?, 1)
  `).run(hash);

  // Demo client
  const client = db.prepare(`
    INSERT INTO clients (name, email, phone, company, address, notes, health_score)
    VALUES ('Acme Corp', 'contact@acme.co.za', '+27 11 000 0000', 'Acme Corporation', '10 Industry Road, Johannesburg', 'Key account - pays on time', 90)
  `).run();

  // Demo job
  const job = db.prepare(`
    INSERT INTO jobs (client_id, title, description, status, hourly_rate, estimated_hours, start_date)
    VALUES (?, 'Website Redesign', 'Full redesign of corporate website', 'active', 800, 20, date('now'))
  `).run(client.lastInsertRowid);

  // Demo invoice
  const lineItems = JSON.stringify([
    { description: 'Website Design', quantity: 3, unitPrice: 2400 },
    { description: 'Development', quantity: 5, unitPrice: 800 }
  ]);
  const subtotal = 3 * 2400 + 5 * 800;
  const vatAmount = subtotal * 0.15;
  const total = subtotal + vatAmount;

  db.prepare(`
    INSERT INTO invoices (job_id, client_id, invoice_number, line_items, subtotal, vat_rate, vat_amount, total, status, due_date)
    VALUES (?, ?, 'INV-001', ?, ?, 15, ?, ?, 'sent', date('now', '+30 days'))
  `).run(job.lastInsertRowid, client.lastInsertRowid, lineItems, subtotal, vatAmount, total);

  // Activity feed entries
  const entries = [
    ['invoice_sent', 'Invoice INV-001 sent to Acme Corp', 'invoice', 1],
    ['job_created', 'Job "Website Redesign" created for Acme Corp', 'job', 1],
    ['client_added', 'New client Acme Corp added', 'client', 1],
  ];
  const insertActivity = db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)');
  for (const e of entries) insertActivity.run(...e);

  console.log('Demo data seeded.');
}

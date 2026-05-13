import cron from 'node-cron';
import db from '../db/schema.js';
import { sendReminderEmail } from './email.js';
import { generateInvoicePDF } from './pdf.js';

export function startPaymentChaser() {
  // Run every 24 hours at 9am
  cron.schedule('0 9 * * *', runChaser);
  console.log('Payment chaser cron started.');
}

async function runChaser() {
  const today = new Date();
  const overdue = db.prepare(`
    SELECT i.*, c.name as client_name, c.email as client_email, c.address as client_address, c.company as client_company, c.phone as client_phone
    FROM invoices i
    LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.status IN ('sent', 'overdue')
      AND i.due_date < date('now')
      AND i.reminders_sent < 3
      AND c.email IS NOT NULL
  `).all();

  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get() || {};

  for (const inv of overdue) {
    const daysOverdue = Math.floor((today - new Date(inv.due_date)) / 86400000);
    let reminderNum = null;

    if (daysOverdue >= 3 && daysOverdue < 7 && inv.reminders_sent < 1) reminderNum = 1;
    else if (daysOverdue >= 7 && daysOverdue < 14 && inv.reminders_sent < 2) reminderNum = 2;
    else if (daysOverdue >= 14 && inv.reminders_sent < 3) reminderNum = 3;

    if (!reminderNum) continue;

    const client = {
      name: inv.client_name,
      email: inv.client_email,
      address: inv.client_address,
      company: inv.client_company,
      phone: inv.client_phone,
    };

    let pdfBuffer = null;
    if (reminderNum >= 2) {
      pdfBuffer = await generatePDFBuffer(inv, client, settings);
    }

    try {
      await sendReminderEmail(parseLineItems(inv), client, settings, reminderNum, pdfBuffer);
      db.prepare("UPDATE invoices SET reminders_sent = reminders_sent + 1, status = 'overdue' WHERE id = ?").run(inv.id);
      db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
        .run('reminder_sent', `Reminder #${reminderNum} sent for invoice ${inv.invoice_number} to ${inv.client_name}`, 'invoice', inv.id);
      console.log(`Reminder #${reminderNum} sent for ${inv.invoice_number}`);
    } catch (e) {
      console.error(`Failed to send reminder for ${inv.invoice_number}:`, e.message);
    }
  }
}

async function generatePDFBuffer(inv, client, settings) {
  return new Promise(async (resolve, reject) => {
    const { default: PDFDocument } = await import('pdfkit');
    const chunks = [];
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    generateInvoicePDF(parseLineItems(inv), client, settings, { pipe: (s) => doc.pipe(s), setHeader: () => {} });
  });
}

function parseLineItems(inv) {
  return { ...inv, line_items: typeof inv.line_items === 'string' ? JSON.parse(inv.line_items || '[]') : inv.line_items };
}

import db from '../db/schema.js';

export function recalculateHealthScore(clientId) {
  const invoices = db.prepare('SELECT * FROM invoices WHERE client_id = ?').all(clientId);
  const jobs = db.prepare('SELECT COUNT(*) as count FROM jobs WHERE client_id = ?').get(clientId);
  const testimonial = db.prepare('SELECT id FROM testimonials WHERE client_id = ? AND approved = 1').get(clientId);

  let score = 100;

  for (const inv of invoices) {
    if (inv.status === 'paid' && inv.paid_at && inv.due_date) {
      const daysLate = Math.floor((new Date(inv.paid_at) - new Date(inv.due_date)) / 86400000);
      if (daysLate > 14) score -= 20;
      else if (daysLate > 7) score -= 10;
    }
    if (inv.reminders_sent >= 3) score -= 30;
  }

  const jobCount = jobs?.count || 0;
  if (jobCount > 1) score += (jobCount - 1) * 15;
  if (testimonial) score += 10;

  score = Math.max(0, Math.min(100, score));

  db.prepare('UPDATE clients SET health_score = ? WHERE id = ?').run(score, clientId);
  return score;
}

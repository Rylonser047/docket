import { Router } from 'express';
import db from '../db/schema.js';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);

router.get('/stats', (req, res) => {
  const activeJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status IN ('active', 'draft')").get().count;

  const unpaidRow = db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM invoices WHERE status IN ('sent', 'overdue')").get();
  const unpaidTotal = unpaidRow.total;

  const hoursThisWeek = db.prepare(`
    SELECT COALESCE(SUM(duration_minutes), 0) as mins FROM time_entries
    WHERE date(start_time) >= date('now', 'weekday 1', '-7 days')
  `).get().mins / 60;

  const overdueCount = db.prepare("SELECT COUNT(*) as count FROM invoices WHERE status = 'overdue' OR (status = 'sent' AND due_date < date('now'))").get().count;

  const activity = db.prepare('SELECT * FROM activity_feed ORDER BY created_at DESC LIMIT 20').all();

  res.json({
    activeJobs,
    unpaidTotal,
    hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
    overdueCount,
    activity,
  });
});

export default router;

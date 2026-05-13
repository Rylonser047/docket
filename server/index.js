import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

import './db/schema.js';
import { seedDemo } from './db/seed.js';

import authRouter from './routes/auth.js';
import clientsRouter from './routes/clients.js';
import jobsRouter from './routes/jobs.js';
import invoicesRouter from './routes/invoices.js';
import timeRouter from './routes/time.js';
import expensesRouter from './routes/expenses.js';
import proposalsRouter from './routes/proposals.js';
import testimonialsRouter from './routes/testimonials.js';
import parseRouter from './routes/parse.js';
import dashboardRouter from './routes/dashboard.js';
import { startPaymentChaser } from './services/chaser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// In dev allow Vite dev server origin; in prod everything is same-origin
if (!isProd) {
  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'] }));
}

app.use(express.json());
app.use('/uploads', express.static(join(__dirname, 'uploads')));

app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/time', timeRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/testimonials', testimonialsRouter);
app.use('/api/parse', parseRouter);
app.use('/api/dashboard', dashboardRouter);

// Serve built React app in production
const clientDist = join(__dirname, '..', 'client', 'dist');
if (isProd && existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // All non-API routes → React app (client-side routing)
  app.get('*', (req, res) => {
    res.sendFile(join(clientDist, 'index.html'));
  });
}

seedDemo();
startPaymentChaser();

app.listen(PORT, () => console.log(`Docket server running on http://localhost:${PORT}`));

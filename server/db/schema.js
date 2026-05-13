import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'docket.db');

mkdirSync(join(__dirname, '..', 'data'), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY,
    name TEXT,
    business_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    bank_name TEXT,
    bank_account TEXT,
    bank_branch TEXT,
    vat_number TEXT,
    password_hash TEXT,
    setup_complete INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    address TEXT,
    notes TEXT,
    health_score INTEGER DEFAULT 100,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    hourly_rate REAL DEFAULT 0,
    estimated_hours REAL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    scope_document TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id),
    client_id INTEGER REFERENCES clients(id),
    invoice_number TEXT UNIQUE,
    line_items TEXT DEFAULT '[]',
    subtotal REAL DEFAULT 0,
    vat_rate REAL DEFAULT 15,
    vat_amount REAL DEFAULT 0,
    total REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    due_date TEXT,
    sent_at TEXT,
    paid_at TEXT,
    reminders_sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id),
    client_id INTEGER REFERENCES clients(id),
    description TEXT,
    start_time TEXT,
    end_time TEXT,
    duration_minutes INTEGER DEFAULT 0,
    billable INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id INTEGER REFERENCES jobs(id),
    client_id INTEGER REFERENCES clients(id),
    description TEXT,
    amount REAL DEFAULT 0,
    category TEXT,
    receipt_image_url TEXT,
    date TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS proposals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    title TEXT,
    project_description TEXT,
    scope TEXT,
    timeline TEXT,
    price REAL DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS testimonials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER REFERENCES clients(id),
    job_id INTEGER REFERENCES jobs(id),
    token TEXT UNIQUE,
    request_sent_at TEXT,
    responded_at TEXT,
    rating INTEGER,
    text TEXT,
    approved INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_feed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    message TEXT,
    entity_type TEXT,
    entity_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

export default db;

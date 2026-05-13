import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import db from '../db/schema.js';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.get('/', (req, res) => {
  const proposals = db.prepare(`SELECT p.*, c.name as client_name FROM proposals p LEFT JOIN clients c ON p.client_id = c.id ORDER BY p.created_at DESC`).all();
  res.json(proposals);
});

router.get('/:id', (req, res) => {
  const p = db.prepare(`SELECT p.*, c.name as client_name, c.email as client_email FROM proposals p LEFT JOIN clients c ON p.client_id = c.id WHERE p.id = ?`).get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

router.post('/', (req, res) => {
  const { client_id, title, project_description, scope, timeline, price, status } = req.body;
  const result = db.prepare(
    'INSERT INTO proposals (client_id, title, project_description, scope, timeline, price, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(client_id, title, project_description, scope, timeline, price || 0, status || 'draft');
  db.prepare('INSERT INTO activity_feed (type, message, entity_type, entity_id) VALUES (?, ?, ?, ?)')
    .run('proposal_created', `Proposal "${title}" created`, 'proposal', result.lastInsertRowid);
  res.json(db.prepare('SELECT * FROM proposals WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { client_id, title, project_description, scope, timeline, price, status } = req.body;
  db.prepare('UPDATE proposals SET client_id=?, title=?, project_description=?, scope=?, timeline=?, price=?, status=? WHERE id=?')
    .run(client_id, title, project_description, scope, timeline, price, status, req.params.id);
  res.json(db.prepare('SELECT * FROM proposals WHERE id = ?').get(req.params.id));
});

router.post('/generate', async (req, res) => {
  const { description, client_name, title } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a professional proposal writer for a freelance tradesperson/service provider. Write a comprehensive, professional project proposal based on this description. Return ONLY a JSON object with these fields: { "title": "string", "scope": "string (markdown, detailed scope of work)", "timeline": "string (project timeline)", "terms": "string (payment and project terms)" }. Client: ${client_name || 'the client'}. Description: ${description}`
      }]
    });
    const text = msg.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Failed to parse AI response' });
    res.json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

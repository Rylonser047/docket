import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { requireAuth } from './auth.js';

const router = Router();
router.use(requireAuth);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/invoice', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{
        role: 'user',
        content: `Extract invoice details from this text and return ONLY valid JSON with no preamble: { "clientHint": "string or null", "lineItems": [{"description": "string", "quantity": number, "unitPrice": number}], "vatIncluded": boolean }. Amounts should be in ZAR numbers only (no R symbol). Text: ${text}`
      }]
    });
    const raw = msg.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse response' });
    res.json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/proposal', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Extract proposal details from this voice/text input and return ONLY valid JSON: { "title": "string", "description": "string", "clientHint": "string or null", "price": number or null, "timeline": "string or null" }. Text: ${text}`
      }]
    });
    const raw = msg.content[0].text.trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'Could not parse response' });
    res.json(JSON.parse(jsonMatch[0]));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

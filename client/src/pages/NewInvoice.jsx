import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatZAR } from '../lib/utils.js';
import VoiceInput from '../components/VoiceInput.jsx';

const DEFAULT_ITEM = { description: '', quantity: 1, unitPrice: 0 };

export default function NewInvoice() {
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clientId, setClientId] = useState('');
  const [jobId, setJobId] = useState('');
  const [lineItems, setLineItems] = useState([{ ...DEFAULT_ITEM }]);
  const [vatRate, setVatRate] = useState(15);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [smartText, setSmartText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/clients').then(setClients);
    api.get('/jobs').then(setJobs);
  }, []);

  const clientJobs = jobs.filter(j => String(j.client_id) === String(clientId));

  const subtotal = lineItems.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const parseSmartText = async (text) => {
    if (!text.trim()) return;
    setParsing(true);
    setError('');
    try {
      const data = await api.post('/parse/invoice', { text });
      if (data.lineItems?.length) setLineItems(data.lineItems.map(i => ({ description: i.description || '', quantity: i.quantity || 1, unitPrice: i.unitPrice || 0 })));
      if (data.clientHint) {
        const match = clients.find(c => c.name.toLowerCase().includes(data.clientHint.toLowerCase()));
        if (match) setClientId(String(match.id));
      }
      if (data.vatIncluded === false) setVatRate(0);
    } catch (e) {
      setError('Could not parse: ' + e.message);
    } finally { setParsing(false); }
  };

  const updateItem = (idx, key, val) => setLineItems(items => items.map((item, i) => i === idx ? { ...item, [key]: val } : item));
  const addItem = () => setLineItems(items => [...items, { ...DEFAULT_ITEM }]);
  const removeItem = (idx) => setLineItems(items => items.filter((_, i) => i !== idx));

  const buildPayload = (status) => ({ client_id: clientId || undefined, job_id: jobId || undefined, line_items: lineItems, vat_rate: vatRate, due_date: dueDate, status });

  const save = async () => {
    setSaving(true); setError('');
    try {
      const inv = await api.post('/invoices', buildPayload('draft'));
      navigate('/invoices');
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const generateAndSend = async () => {
    if (!clientId) return setError('Please select a client');
    const client = clients.find(c => String(c.id) === String(clientId));
    if (!client?.email) return setError('Client has no email address');
    setSending(true); setError('');
    try {
      const inv = await api.post('/invoices', buildPayload('draft'));
      await api.post(`/invoices/${inv.id}/send`);
      navigate('/invoices');
    } catch (e) { setError(e.message); } finally { setSending(false); }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/invoices')} className="text-sm text-gray-500 hover:text-gray-700">← Back</button>
        <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-5">
          {/* Smart input */}
          <div className="card p-5">
            <label className="label">Smart Input</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                value={smartText}
                onChange={e => setSmartText(e.target.value)}
                placeholder='e.g. "3 days website work at R800/day plus VAT"'
                onKeyDown={e => e.key === 'Enter' && parseSmartText(smartText)}
              />
              <VoiceInput onTranscript={t => { setSmartText(t); parseSmartText(t); }} disabled={parsing} />
              <button type="button" onClick={() => parseSmartText(smartText)} disabled={parsing || !smartText} className="btn-secondary whitespace-nowrap">
                {parsing ? '…' : '✨ Parse'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Type or speak naturally — AI will extract line items and fill the form.</p>
          </div>

          {/* Client & Job */}
          <div className="card p-5 grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client</label>
              <select className="input" value={clientId} onChange={e => setClientId(e.target.value)}>
                <option value="">Select client…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Job (optional)</label>
              <select className="input" value={jobId} onChange={e => setJobId(e.target.value)} disabled={!clientId}>
                <option value="">No specific job</option>
                {clientJobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input className="input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
            <div>
              <label className="label">VAT Rate (%)</label>
              <input className="input" type="number" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} min="0" max="100" />
            </div>
          </div>

          {/* Line items */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Line Items</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 px-1">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-3 text-right">Unit Price</div>
                <div />
              </div>
              {lineItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2">
                  <input className="input col-span-6" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)} placeholder="Description" />
                  <input className="input col-span-2" type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} min="0" step="0.5" />
                  <input className="input col-span-3" type="number" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} min="0" placeholder="0.00" />
                  <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-400 transition-colors text-lg">×</button>
                </div>
              ))}
            </div>
            <button onClick={addItem} className="mt-3 text-sm text-teal-600 hover:text-teal-700 font-medium">+ Add line item</button>
          </div>
        </div>

        {/* Totals sidebar */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-8">
            <h3 className="font-semibold text-gray-900 mb-4">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatZAR(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">VAT ({vatRate}%)</span>
                <span className="font-medium">{formatZAR(vatAmount)}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="font-semibold text-gray-900">Total</span>
                <span className="font-bold text-lg text-teal-600">{formatZAR(total)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              {error && <p className="text-xs text-red-500 bg-red-50 px-2 py-1.5 rounded">{error}</p>}
              <button onClick={generateAndSend} disabled={sending} className="btn-primary w-full justify-center">
                {sending ? 'Sending…' : '📨 Generate & Send'}
              </button>
              <button onClick={save} disabled={saving} className="btn-secondary w-full justify-center">
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

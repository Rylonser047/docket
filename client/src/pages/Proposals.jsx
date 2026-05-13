import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { formatDate, statusColor, formatZAR } from '../lib/utils.js';
import Modal from '../components/Modal.jsx';
import VoiceInput from '../components/VoiceInput.jsx';

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = () => Promise.all([api.get('/proposals'), api.get('/clients')]).then(([p, c]) => { setProposals(p); setClients(c); });
  useEffect(() => { load(); }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
        <button onClick={() => { setSelected(null); setShowForm(true); }} className="btn-primary">+ New Proposal</button>
      </div>

      <div className="card divide-y divide-gray-50">
        {proposals.length === 0 && <p className="p-6 text-sm text-gray-400">No proposals yet.</p>}
        {proposals.map(p => (
          <div key={p.id} className="px-5 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-gray-900">{p.title}</span>
                <span className={statusColor(p.status)}>{p.status}</span>
              </div>
              <p className="text-sm text-gray-500">{p.client_name} • {formatDate(p.created_at)}</p>
            </div>
            <span className="font-semibold text-gray-900">{formatZAR(p.price)}</span>
            <button onClick={() => { setSelected(p); setShowForm(true); }} className="btn-secondary text-xs">Edit</button>
          </div>
        ))}
      </div>

      {showForm && (
        <ProposalForm
          proposal={selected}
          clients={clients}
          onClose={() => { setShowForm(false); setSelected(null); load(); }}
        />
      )}
    </div>
  );
}

function ProposalForm({ proposal, clients, onClose }) {
  const [form, setForm] = useState(proposal || { client_id: '', title: '', project_description: '', scope: '', timeline: '', price: '', status: 'draft' });
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = k => e => setForm(f => ({ ...f, [k]: typeof e === 'string' ? e : e.target.value }));

  const generate = async () => {
    if (!form.project_description) return setError('Enter a description first');
    setGenerating(true); setError('');
    try {
      const client = clients.find(c => String(c.id) === String(form.client_id));
      const data = await api.post('/proposals/generate', {
        description: form.project_description,
        client_name: client?.name,
        title: form.title,
      });
      setForm(f => ({
        ...f,
        title: data.title || f.title,
        scope: data.scope || '',
        timeline: data.timeline || '',
      }));
    } catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  };

  const handleVoice = async (text) => {
    setForm(f => ({ ...f, project_description: text }));
    setGenerating(true); setError('');
    try {
      const res = await api.post('/parse/proposal', { text });
      setForm(f => ({
        ...f,
        title: res.title || f.title,
        project_description: res.description || text,
        timeline: res.timeline || f.timeline,
        price: res.price ? String(res.price) : f.price,
      }));
    } catch (e) { setError(e.message); }
    finally { setGenerating(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (proposal) await api.put(`/proposals/${proposal.id}`, form);
      else await api.post('/proposals', form);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={proposal ? 'Edit Proposal' : 'New Proposal'} onClose={onClose} size="xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Client</label>
            <select className="input" value={form.client_id} onChange={set('client_id')}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={set('title')} placeholder="e.g. Full Bathroom Renovation" />
          </div>
        </div>

        <div>
          <label className="label">Project Description</label>
          <div className="flex gap-2">
            <textarea
              className="input resize-none flex-1"
              rows={3}
              value={form.project_description}
              onChange={set('project_description')}
              placeholder="Describe the project — speak naturally or type…"
            />
            <div className="flex flex-col gap-2">
              <VoiceInput onTranscript={handleVoice} disabled={generating} />
              <button type="button" onClick={generate} disabled={generating} className="btn-secondary text-xs px-2">
                {generating ? '…' : '✨ AI'}
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="label">Scope of Work (AI-generated or manual)</label>
          <textarea className="input resize-none font-mono text-xs" rows={6} value={form.scope} onChange={set('scope')} placeholder="Detailed scope will appear here after AI generation…" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">Timeline</label>
            <input className="input" value={form.timeline} onChange={set('timeline')} placeholder="e.g. 3 weeks" />
          </div>
          <div>
            <label className="label">Price (ZAR)</label>
            <input className="input" type="number" value={form.price} onChange={set('price')} placeholder="0" />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {['draft', 'sent', 'accepted', 'declined'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded">{error}</p>}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : 'Save Proposal'}</button>
        </div>
      </form>
    </Modal>
  );
}

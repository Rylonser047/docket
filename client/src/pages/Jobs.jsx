import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatZAR, formatDate, statusColor } from '../lib/utils.js';
import Modal from '../components/Modal.jsx';

const STATUSES = ['draft', 'active', 'completed', 'invoiced', 'paid'];

export default function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showScope, setShowScope] = useState(null);
  const navigate = useNavigate();

  const load = () => Promise.all([
    api.get('/jobs'),
    api.get('/clients'),
  ]).then(([j, c]) => { setJobs(j); setClients(c); });

  useEffect(() => { load(); }, []);

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = jobs.filter(j => j.status === s);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jobs</h1>
        <button onClick={() => { setSelected(null); setShowForm(true); }} className="btn-primary">+ New Job</button>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map(status => (
          <div key={status} className="flex-shrink-0 w-64">
            <div className="flex items-center gap-2 mb-3">
              <span className={statusColor(status)}>{status}</span>
              <span className="text-xs text-gray-400">({grouped[status].length})</span>
            </div>
            <div className="space-y-3">
              {grouped[status].map(job => (
                <div key={job.id} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => { setSelected(job); setShowForm(true); }}>
                  <p className="font-medium text-sm text-gray-900 mb-1">{job.title}</p>
                  <p className="text-xs text-gray-500 mb-2">{job.client_name}</p>
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>{formatZAR(job.hourly_rate)}/hr</span>
                    <span>{job.estimated_hours}h est.</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setShowScope(job); }}
                    className="mt-2 text-xs text-teal-600 hover:text-teal-700"
                  >
                    {job.scope_document ? '📋 View Scope' : '+ Lock Scope'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <JobForm
          job={selected}
          clients={clients}
          onClose={() => { setShowForm(false); setSelected(null); load(); }}
        />
      )}

      {showScope && (
        <ScopeModal
          job={showScope}
          onClose={() => { setShowScope(null); load(); }}
        />
      )}
    </div>
  );
}

function JobForm({ job, clients, onClose }) {
  const [form, setForm] = useState(job || { client_id: '', title: '', description: '', status: 'draft', hourly_rate: '', estimated_hours: '', start_date: '', end_date: '' });
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (job) await api.put(`/jobs/${job.id}`, form);
      else await api.post('/jobs', form);
      onClose();
    } finally { setLoading(false); }
  };

  const del = async () => {
    if (!confirm('Delete this job?')) return;
    await api.delete(`/jobs/${job.id}`);
    onClose();
  };

  return (
    <Modal title={job ? 'Edit Job' : 'New Job'} onClose={onClose} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={set('title')} required />
          </div>
          <div>
            <label className="label">Client</label>
            <select className="input" value={form.client_id} onChange={set('client_id')}>
              <option value="">Select client…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Hourly Rate (ZAR)</label>
            <input className="input" type="number" value={form.hourly_rate} onChange={set('hourly_rate')} placeholder="800" />
          </div>
          <div>
            <label className="label">Estimated Hours</label>
            <input className="input" type="number" value={form.estimated_hours} onChange={set('estimated_hours')} placeholder="20" />
          </div>
          <div>
            <label className="label">Start Date</label>
            <input className="input" type="date" value={form.start_date || ''} onChange={set('start_date')} />
          </div>
          <div>
            <label className="label">End Date</label>
            <input className="input" type="date" value={form.end_date || ''} onChange={set('end_date')} />
          </div>
          <div className="col-span-2">
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description || ''} onChange={set('description')} />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          {job && <button type="button" onClick={del} className="btn-danger">Delete</button>}
          <div className="flex-1" />
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

function ScopeModal({ job, onClose }) {
  const [scope, setScope] = useState({ included: '', excluded: '', revisions: '2', timeline: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (job.scope_document) {
      try { setScope(JSON.parse(job.scope_document)); } catch {}
    }
  }, [job]);

  const save = async () => {
    setLoading(true);
    try {
      await api.put(`/jobs/${job.id}`, { ...job, scope_document: JSON.stringify(scope) });
      onClose();
    } finally { setLoading(false); }
  };

  const set = k => e => setScope(s => ({ ...s, [k]: e.target.value }));

  return (
    <Modal title={`Scope Shield — ${job.title}`} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="bg-teal-50 border border-teal-100 rounded-lg p-3 text-sm text-teal-700">
          Define exactly what's in and out of scope to protect yourself from scope creep.
        </div>
        <div>
          <label className="label">What's Included ✅</label>
          <textarea className="input resize-none" rows={4} value={scope.included} onChange={set('included')} placeholder="List everything included in this job…" />
        </div>
        <div>
          <label className="label">What's NOT Included ❌</label>
          <textarea className="input resize-none" rows={3} value={scope.excluded} onChange={set('excluded')} placeholder="List exclusions, out-of-scope items…" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Number of Revisions</label>
            <input className="input" type="number" value={scope.revisions} onChange={set('revisions')} min="0" />
          </div>
          <div>
            <label className="label">Timeline</label>
            <input className="input" value={scope.timeline} onChange={set('timeline')} placeholder="e.g. 2 weeks from approval" />
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={save} disabled={loading} className="btn-primary flex-1">🔒 {loading ? 'Saving…' : 'Lock Scope'}</button>
        </div>
      </div>
    </Modal>
  );
}

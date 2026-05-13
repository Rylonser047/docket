import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatZAR, formatDate, statusColor, healthColor } from '../lib/utils.js';
import Modal from '../components/Modal.jsx';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const load = () => api.get(`/clients${search ? `?search=${encodeURIComponent(search)}` : ''}`).then(setClients);
  useEffect(() => { load(); }, [search]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Client</button>
      </div>

      <div className="mb-4">
        <input className="input max-w-xs" placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card divide-y divide-gray-50">
        {clients.length === 0 && <p className="p-6 text-sm text-gray-400">No clients yet.</p>}
        {clients.map(c => (
          <button key={c.id} onClick={() => navigate(`/clients/${c.id}`)} className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {c.name[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-sm text-gray-500 truncate">{c.company || c.email}</p>
            </div>
            <span className={healthColor(c.health_score)}>
              {c.health_score}/100
            </span>
            <span className="text-gray-300">›</span>
          </button>
        ))}
      </div>

      {showForm && <ClientForm onClose={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

export function ClientDetail() {
  const { id } = useParams();
  const [client, setClient] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const navigate = useNavigate();

  const load = () => api.get(`/clients/${id}`).then(setClient);
  useEffect(() => { load(); }, [id]);

  if (!client) return <div className="p-8 text-gray-400">Loading…</div>;

  return (
    <div className="p-8">
      <button onClick={() => navigate('/clients')} className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">← Back</button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xl">
            {client.name[0]}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-500">{client.company || client.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`${healthColor(client.health_score)} text-sm px-3 py-1`}>Health: {client.health_score}/100</span>
          <button onClick={() => setShowEdit(true)} className="btn-secondary">Edit</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8">
        <InfoCard label="Email" value={client.email} />
        <InfoCard label="Phone" value={client.phone} />
        <InfoCard label="Address" value={client.address} />
      </div>

      {client.notes && (
        <div className="card p-4 mb-6">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-gray-700">{client.notes}</p>
        </div>
      )}

      <Section title="Jobs" items={client.jobs} renderItem={j => (
        <div key={j.id} className="px-4 py-3 flex items-center gap-3">
          <span className={statusColor(j.status)}>{j.status}</span>
          <span className="text-sm text-gray-900 flex-1">{j.title}</span>
          <span className="text-xs text-gray-400">{formatZAR(j.hourly_rate)}/hr</span>
        </div>
      )} />

      <Section title="Invoices" items={client.invoices} renderItem={inv => (
        <div key={inv.id} className="px-4 py-3 flex items-center gap-3">
          <span className={statusColor(inv.status)}>{inv.status}</span>
          <span className="text-sm text-gray-900 flex-1">{inv.invoice_number}</span>
          <span className="text-sm font-medium text-gray-900">{formatZAR(inv.total)}</span>
          <span className="text-xs text-gray-400">due {formatDate(inv.due_date)}</span>
        </div>
      )} />

      {showEdit && <ClientForm client={client} onClose={() => { setShowEdit(false); load(); }} />}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-sm text-gray-800">{value || '—'}</p>
    </div>
  );
}

function Section({ title, items, renderItem }) {
  return (
    <div className="card mb-4">
      <div className="px-4 py-3 border-b border-gray-50">
        <h3 className="font-semibold text-gray-900 text-sm">{title} ({items?.length || 0})</h3>
      </div>
      {items?.length === 0 ? (
        <p className="px-4 py-3 text-sm text-gray-400">None yet</p>
      ) : (
        <div className="divide-y divide-gray-50">{items?.map(renderItem)}</div>
      )}
    </div>
  );
}

function ClientForm({ client, onClose }) {
  const [form, setForm] = useState(client || { name: '', email: '', phone: '', company: '', address: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (client) await api.put(`/clients/${client.id}`, form);
      else await api.post('/clients', form);
      onClose();
    } finally { setLoading(false); }
  };

  return (
    <Modal title={client ? 'Edit Client' : 'New Client'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          {[['Name', 'name', true], ['Company', 'company'], ['Email', 'email'], ['Phone', 'phone']].map(([l, k, req]) => (
            <div key={k}>
              <label className="label">{l}{req && '*'}</label>
              <input className="input" value={form[k] || ''} onChange={set(k)} required={!!req} />
            </div>
          ))}
        </div>
        <div><label className="label">Address</label><input className="input" value={form.address || ''} onChange={set('address')} /></div>
        <div><label className="label">Notes</label><textarea className="input resize-none" rows={3} value={form.notes || ''} onChange={set('notes')} /></div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}

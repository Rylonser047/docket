import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import { formatZAR, formatDate } from '../lib/utils.js';

const CATEGORIES = ['materials', 'fuel', 'tools', 'software', 'meals', 'other'];
const CAT_ICONS = { materials: '🧱', fuel: '⛽', tools: '🔧', software: '💻', meals: '🍕', other: '📦' };

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [form, setForm] = useState({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], job_id: '', receipt: null });
  const [loading, setLoading] = useState(false);

  const load = () => Promise.all([api.get('/expenses'), api.get('/jobs')]).then(([e, j]) => { setExpenses(e); setJobs(j); });
  useEffect(() => { load(); }, []);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== null && v !== '') fd.append(k, v); });
      if (form.receipt) fd.append('receipt', form.receipt);
      await api.postForm('/expenses', fd);
      setForm({ description: '', amount: '', category: '', date: new Date().toISOString().split('T')[0], job_id: '', receipt: null });
      load();
    } finally { setLoading(false); }
  };

  const del = async (id) => { await api.delete(`/expenses/${id}`); load(); };

  // Monthly totals by category
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = expenses.filter(e => (e.date || '').startsWith(thisMonth));
  const byCategory = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = monthlyExpenses.filter(e => e.category === cat).reduce((s, e) => s + (e.amount || 0), 0);
    return acc;
  }, {});
  const monthTotal = Object.values(byCategory).reduce((s, v) => s + v, 0);

  const exportCSV = () => {
    const rows = [['Date', 'Description', 'Category', 'Amount', 'Job']];
    expenses.forEach(e => rows.push([e.date, e.description, e.category, e.amount, e.job_title || '']));
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'expenses.csv'; a.click();
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <button onClick={exportCSV} className="btn-secondary">⬇ Export CSV</button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Form */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Add Expense</h2>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="label">Description *</label>
              <input className="input" value={form.description} onChange={set('description')} placeholder="Fuel, materials, tools…" required />
            </div>
            <div>
              <label className="label">Amount (ZAR) *</label>
              <input className="input" type="number" value={form.amount} onChange={set('amount')} placeholder="0.00" step="0.01" required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={set('category')}>
                <option value="">Auto-detect…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input className="input" type="date" value={form.date} onChange={set('date')} />
            </div>
            <div>
              <label className="label">Job (optional)</label>
              <select className="input" value={form.job_id} onChange={set('job_id')}>
                <option value="">No specific job</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Receipt Photo</label>
              <input type="file" accept="image/*" className="input text-xs" onChange={e => setForm(f => ({ ...f, receipt: e.target.files[0] }))} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Saving…' : 'Add Expense'}
            </button>
          </form>
        </div>

        {/* Right panel */}
        <div className="col-span-2 space-y-4">
          {/* Monthly breakdown */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">This Month</h2>
              <span className="font-bold text-gray-900">{formatZAR(monthTotal)}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <div key={cat} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-lg mb-1">{CAT_ICONS[cat]}</p>
                  <p className="text-sm font-semibold text-gray-900">{formatZAR(byCategory[cat])}</p>
                  <p className="text-xs text-gray-400 capitalize">{cat}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Expense list */}
          <div className="card divide-y divide-gray-50">
            {expenses.length === 0 && <p className="p-5 text-sm text-gray-400">No expenses yet.</p>}
            {expenses.map(e => (
              <div key={e.id} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{CAT_ICONS[e.category] || '📦'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{e.description}</p>
                  <p className="text-xs text-gray-400">{formatDate(e.date)}{e.job_title ? ` • ${e.job_title}` : ''}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">{formatZAR(e.amount)}</span>
                {e.receipt_image_url && (
                  <a href={e.receipt_image_url} target="_blank" rel="noreferrer" className="text-teal-500 text-xs">📷</a>
                )}
                <button onClick={() => del(e.id)} className="text-gray-200 hover:text-red-400 text-lg">×</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

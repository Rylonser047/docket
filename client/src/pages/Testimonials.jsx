import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatDate } from '../lib/utils.js';

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ client_id: '', job_id: '' });
  const [loading, setLoading] = useState(false);

  const load = () => Promise.all([api.get('/testimonials'), api.get('/clients'), api.get('/jobs')])
    .then(([t, c, j]) => { setTestimonials(t); setClients(c); setJobs(j); });

  useEffect(() => { load(); }, []);

  const approve = async (id) => { await api.post(`/testimonials/${id}/approve`); load(); };
  const request = async (id) => { await api.post(`/testimonials/${id}/request`); load(); };

  const sendNew = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post('/testimonials/new', newForm); setShowNew(false); load(); }
    finally { setLoading(false); }
  };

  const Stars = ({ rating }) => (
    <span>{Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-amber-400' : 'text-gray-200'}>★</span>
    ))}</span>
  );

  const pending = testimonials.filter(t => !t.responded_at);
  const received = testimonials.filter(t => t.responded_at);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Testimonials</h1>
        <button onClick={() => setShowNew(true)} className="btn-primary">+ Request Testimonial</button>
      </div>

      {showNew && (
        <div className="card p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Request a Testimonial</h2>
          <form onSubmit={sendNew} className="flex gap-3 items-end">
            <div>
              <label className="label">Client</label>
              <select className="input" value={newForm.client_id} onChange={e => setNewForm(f => ({ ...f, client_id: e.target.value }))} required>
                <option value="">Select…</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Job (optional)</label>
              <select className="input" value={newForm.job_id} onChange={e => setNewForm(f => ({ ...f, job_id: e.target.value }))}>
                <option value="">No specific job</option>
                {jobs.filter(j => !newForm.client_id || String(j.client_id) === String(newForm.client_id)).map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Sending…' : '📧 Send Request'}</button>
            <button type="button" onClick={() => setShowNew(false)} className="btn-secondary">Cancel</button>
          </form>
        </div>
      )}

      {/* Received */}
      {received.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Received ({received.length})</h2>
          <div className="grid grid-cols-2 gap-4">
            {received.map(t => (
              <div key={t.id} className={`card p-5 ${t.approved ? 'border-green-200' : ''}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{t.client_name}</p>
                    <Stars rating={t.rating} />
                  </div>
                  <div className="flex gap-2">
                    {!t.approved && (
                      <button onClick={() => approve(t.id)} className="btn-secondary text-xs">Approve</button>
                    )}
                    {t.approved && <span className="badge-green">Approved</span>}
                  </div>
                </div>
                {t.text && <p className="text-sm text-gray-700 italic mt-2">"{t.text}"</p>}
                <p className="text-xs text-gray-400 mt-2">{formatDate(t.responded_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <h2 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Awaiting Response ({pending.length})</h2>
          <div className="card divide-y divide-gray-50">
            {pending.map(t => (
              <div key={t.id} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{t.client_name}</p>
                  <p className="text-xs text-gray-400">Requested {formatDate(t.request_sent_at)}</p>
                </div>
                <button onClick={() => request(t.id)} className="btn-secondary text-xs">Resend</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {testimonials.length === 0 && (
        <p className="text-sm text-gray-400">No testimonials yet. Mark invoices as paid to prompt for testimonials.</p>
      )}
    </div>
  );
}

// Public review page
export function ReviewPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/testimonials/review/${token}`)
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setInfo(data); })
      .catch(() => setError('Failed to load'));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Please select a rating');
    const res = await fetch(`/api/testimonials/review/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, text }),
    });
    if (res.ok) setSubmitted(true);
    else { const d = await res.json(); setError(d.error); }
  };

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-md text-center">
        <p className="text-4xl mb-4">😕</p>
        <p className="text-gray-600">{error}</p>
      </div>
    </div>
  );

  if (!info) return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>;

  if (submitted || info.already_responded) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card p-8 max-w-md text-center">
        <p className="text-5xl mb-4">🌟</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h1>
        <p className="text-gray-500">Your review has been submitted.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-teal-600 mb-1">DOCKET</h1>
          <p className="text-gray-600">Hi {info.client_name}, leave a quick review!</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label text-center block mb-2">Your Rating</label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button type="button" key={n} onClick={() => setRating(n)}
                  className={`text-3xl transition-transform hover:scale-110 ${n <= rating ? 'text-amber-400' : 'text-gray-200'}`}>
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Your Review (optional)</label>
            <textarea className="input resize-none" rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="What was it like working with us?" />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn-primary w-full justify-center py-3">Submit Review</button>
        </form>
      </div>
    </div>
  );
}

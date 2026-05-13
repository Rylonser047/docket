import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatZAR, formatDate, statusColor } from '../lib/utils.js';
import Modal from '../components/Modal.jsx';

const STATUSES = ['all', 'draft', 'sent', 'overdue', 'paid'];

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [paidModal, setPaidModal] = useState(null);
  const status = searchParams.get('status') || 'all';
  const navigate = useNavigate();

  const load = () => api.get(`/invoices${status !== 'all' ? `?status=${status}` : ''}`).then(setInvoices);
  useEffect(() => { load(); }, [status]);

  const markPaid = async (inv, requestTestimonial) => {
    await api.post(`/invoices/${inv.id}/paid`, { request_testimonial: requestTestimonial });
    setPaidModal(null);
    load();
  };

  const resend = async (inv) => {
    try {
      await api.post(`/invoices/${inv.id}/send`);
      alert('Invoice resent!');
      load();
    } catch (e) { alert(e.message); }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary">+ New Invoice</button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {STATUSES.map(s => (
          <button key={s} onClick={() => setSearchParams(s === 'all' ? {} : { status: s })}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${status === s ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {s}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-gray-50">
        {invoices.length === 0 && <p className="p-6 text-sm text-gray-400">No invoices{status !== 'all' ? ` with status "${status}"` : ''} yet.</p>}
        {invoices.map(inv => (
          <div key={inv.id} className="px-5 py-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-gray-900">{inv.invoice_number}</span>
                <span className={statusColor(inv.status)}>{inv.status}</span>
              </div>
              <p className="text-sm text-gray-500">{inv.client_name}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-gray-900">{formatZAR(inv.total)}</p>
              <p className="text-xs text-gray-400">Due {formatDate(inv.due_date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary text-xs">PDF</a>
              {inv.status !== 'paid' && (
                <>
                  <button onClick={() => resend(inv)} className="btn-secondary text-xs">Resend</button>
                  <button onClick={() => setPaidModal(inv)} className="btn-primary text-xs">Mark Paid</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {paidModal && (
        <Modal title="Mark as Paid" onClose={() => setPaidModal(null)} size="sm">
          <p className="text-sm text-gray-600 mb-4">Mark <strong>{paidModal.invoice_number}</strong> ({formatZAR(paidModal.total)}) as paid?</p>
          <div className="space-y-2">
            <button onClick={() => markPaid(paidModal, true)} className="btn-primary w-full justify-center">
              ✅ Mark Paid + Request Testimonial
            </button>
            <button onClick={() => markPaid(paidModal, false)} className="btn-secondary w-full justify-center">
              Mark Paid Only
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { formatZAR, formatDateTime, relativeTime } from '../lib/utils.js';

const activityIcons = {
  invoice_created: '📄',
  invoice_sent: '📨',
  invoice_paid: '✅',
  reminder_sent: '🔔',
  job_created: '🔨',
  client_added: '👤',
  time_logged: '⏱',
  expense_added: '💳',
  proposal_created: '📋',
  testimonial_received: '⭐',
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard/stats').then(setStats).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-400">Loading…</div>;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with your business</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard label="Active Jobs" value={stats?.activeJobs ?? 0} icon="🔨" color="blue" onClick={() => navigate('/jobs')} />
        <StatCard label="Unpaid Invoices" value={formatZAR(stats?.unpaidTotal ?? 0)} icon="📄" color="amber" onClick={() => navigate('/invoices?status=sent')} />
        <StatCard label="Hours This Week" value={`${stats?.hoursThisWeek ?? 0}h`} icon="⏱" color="teal" onClick={() => navigate('/time')} />
        <StatCard label="Overdue" value={stats?.overdueCount ?? 0} icon="🔴" color={stats?.overdueCount > 0 ? 'red' : 'gray'} onClick={() => navigate('/invoices?status=overdue')} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="col-span-2 card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {stats?.activity?.length === 0 ? (
            <p className="text-sm text-gray-400">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {(stats?.activity || []).map(a => (
                <div key={a.id} className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{activityIcons[a.type] || '•'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{relativeTime(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link to="/invoices/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-teal-50 transition-colors group">
              <span className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center text-base">📄</span>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-teal-700">New Invoice</p>
                <p className="text-xs text-gray-400">Create & send</p>
              </div>
            </Link>
            <Link to="/time" className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors group">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-base">⏱</span>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">Log Time</p>
                <p className="text-xs text-gray-400">Track billable hours</p>
              </div>
            </Link>
            <Link to="/expenses" className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors group">
              <span className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-base">💳</span>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-orange-700">Add Expense</p>
                <p className="text-xs text-gray-400">Log a cost</p>
              </div>
            </Link>
            <Link to="/proposals" className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors group">
              <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-base">📋</span>
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-purple-700">New Proposal</p>
                <p className="text-xs text-gray-400">Win new work</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color, onClick }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-teal-50 text-teal-600',
    red: 'bg-red-50 text-red-600',
    gray: 'bg-gray-50 text-gray-500',
  };
  return (
    <button onClick={onClick} className="card p-5 text-left hover:shadow-md transition-shadow w-full">
      <div className={`w-10 h-10 rounded-xl ${colors[color]} flex items-center justify-center text-xl mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </button>
  );
}

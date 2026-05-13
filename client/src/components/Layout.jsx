import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

const nav = [
  { to: '/', label: 'Dashboard', icon: '⊞' },
  { to: '/clients', label: 'Clients', icon: '👥' },
  { to: '/jobs', label: 'Jobs', icon: '🔨' },
  { to: '/invoices', label: 'Invoices', icon: '📄' },
  { to: '/time', label: 'Time', icon: '⏱' },
  { to: '/expenses', label: 'Expenses', icon: '💳' },
  { to: '/proposals', label: 'Proposals', icon: '📋' },
  { to: '/testimonials', label: 'Testimonials', icon: '⭐' },
  { to: '/rate-calc', label: 'Rate Calc', icon: '🧮' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-100">
          <span className="text-xl font-bold text-teal-600 tracking-tight">DOCKET</span>
          {user && <p className="text-xs text-gray-500 mt-0.5 truncate">{user.business_name}</p>}
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {nav.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-teal-50 text-teal-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <span className="text-base">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-1">
          <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${isActive ? 'bg-teal-50 text-teal-700' : 'text-gray-500 hover:bg-gray-50'}`}>
            <span>⚙️</span> Settings
          </NavLink>
          <button onClick={() => { logout(); navigate('/login'); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors text-left">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

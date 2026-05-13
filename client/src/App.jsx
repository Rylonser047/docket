import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Setup from './pages/Setup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Clients, { ClientDetail } from './pages/Clients.jsx';
import Jobs from './pages/Jobs.jsx';
import Invoices from './pages/Invoices.jsx';
import NewInvoice from './pages/NewInvoice.jsx';
import TimeTracker from './pages/TimeTracker.jsx';
import Expenses from './pages/Expenses.jsx';
import Proposals from './pages/Proposals.jsx';
import Testimonials, { ReviewPage } from './pages/Testimonials.jsx';
import RateCalc from './pages/RateCalc.jsx';
import Settings from './pages/Settings.jsx';

function AppRoutes() {
  const { user, loading, setupRequired } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-teal-600 font-bold text-xl animate-pulse">DOCKET</div>
      </div>
    );
  }

  if (setupRequired) return <Setup />;

  if (!user) {
    return (
      <Routes>
        <Route path="/review/:token" element={<ReviewPage />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/review/:token" element={<ReviewPage />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/clients" element={<Clients />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/invoices" element={<Invoices />} />
        <Route path="/invoices/new" element={<NewInvoice />} />
        <Route path="/time" element={<TimeTracker />} />
        <Route path="/expenses" element={<Expenses />} />
        <Route path="/proposals" element={<Proposals />} />
        <Route path="/testimonials" element={<Testimonials />} />
        <Route path="/rate-calc" element={<RateCalc />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

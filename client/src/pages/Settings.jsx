import { useState } from 'react';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Settings() {
  const { user, updateSettings } = useAuth();
  const [form, setForm] = useState(user || {});
  const [password, setPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setSaved(false);
    setLoading(true);
    try {
      await updateSettings({ ...form, password: password || undefined });
      setSaved(true);
      setPassword('');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const Field = ({ label, name, type = 'text', placeholder }) => (
    <div>
      <label className="label">{label}</label>
      <input type={type} className="input" value={form[name] || ''} onChange={set(name)} placeholder={placeholder} />
    </div>
  );

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      <form onSubmit={submit} className="space-y-6">
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Business Info</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Your Name" name="name" placeholder="Jane Smith" />
            <Field label="Business Name" name="business_name" placeholder="Jane's Plumbing" />
            <Field label="Email" name="email" type="email" placeholder="jane@example.com" />
            <Field label="Phone" name="phone" placeholder="+27 82 000 0000" />
          </div>
          <div className="mt-4">
            <Field label="Address" name="address" placeholder="1 Main St, Cape Town" />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Banking Details</h2>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Bank Name" name="bank_name" placeholder="FNB" />
            <Field label="Account Number" name="bank_account" placeholder="62000000000" />
            <Field label="Branch Code" name="bank_branch" placeholder="250655" />
          </div>
          <div className="mt-4">
            <Field label="VAT Number" name="vat_number" placeholder="4012345678" />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Change Password</h2>
          <div>
            <label className="label">New Password (leave blank to keep current)</label>
            <input type="password" className="input max-w-xs" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        {saved && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg">Settings saved successfully!</p>}

        <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving…' : 'Save Settings'}</button>
      </form>
    </div>
  );
}

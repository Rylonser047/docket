import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Setup() {
  const { setup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', business_name: '', email: '', phone: '', address: '', bank_name: '', bank_account: '', bank_branch: '', vat_number: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setError('');
    setLoading(true);
    try {
      await setup(form);
      navigate('/');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, name, type = 'text', placeholder, required }) => (
    <div>
      <label className="label">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input type={type} className="input" value={form[name]} onChange={set(name)} placeholder={placeholder} required={required} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 py-12">
      <div className="card w-full max-w-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-teal-600 tracking-tight">DOCKET</h1>
          <p className="text-gray-500 mt-1">Set up your freelancer account</p>
        </div>
        <form onSubmit={submit} className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Personal Info</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Your Name" name="name" required placeholder="Jane Smith" />
              <Field label="Business Name" name="business_name" placeholder="Jane's Plumbing" />
              <Field label="Email" name="email" type="email" required placeholder="jane@example.com" />
              <Field label="Phone" name="phone" placeholder="+27 82 000 0000" />
            </div>
            <div className="mt-4">
              <Field label="Business Address" name="address" placeholder="1 Main St, Cape Town, 8001" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Banking Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <Field label="Bank Name" name="bank_name" placeholder="FNB" />
              <Field label="Account Number" name="bank_account" placeholder="62000000000" />
              <Field label="Branch Code" name="bank_branch" placeholder="250655" />
            </div>
            <div className="mt-4">
              <Field label="VAT Number (optional)" name="vat_number" placeholder="4012345678" />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Set Password</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Password" name="password" type="password" required placeholder="min. 6 characters" />
              <Field label="Confirm Password" name="confirm" type="password" required placeholder="repeat password" />
            </div>
          </div>

          {error && <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
            {loading ? 'Setting up…' : 'Create My Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

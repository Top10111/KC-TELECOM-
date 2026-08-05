import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ApiError } from '../../lib/api';
import { Banner, Button, Input } from '../../components/ui';

// Mirrors backend src/auth/dto/register.dto.ts exactly:
// - phone must match /^0\d{10}$/ (e.g. 08012345678)
// - password minLength 8
// - businessName optional
export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: '',
    phone: '',
    fullName: '',
    businessName: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^0\d{10}$/.test(form.phone)) {
      setError('Phone must be a valid Nigerian phone number, e.g. 08012345678');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);
    try {
      await register({
        email: form.email,
        phone: form.phone,
        fullName: form.fullName,
        businessName: form.businessName || undefined,
        password: form.password,
      });
      navigate('/vendor', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-brand-600">KC TELECOM</h1>
        <p className="mt-1 text-sm text-slate-500">Create a vendor account</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <Banner kind="error" message={error} />}
          <Input label="Full name" required value={form.fullName} onChange={set('fullName')} />
          <Input label="Email" type="email" required value={form.email} onChange={set('email')} />
          <Input
            label="Phone"
            required
            placeholder="08012345678"
            value={form.phone}
            onChange={set('phone')}
          />
          <Input
            label="Business name (optional)"
            value={form.businessName}
            onChange={set('businessName')}
          />
          <Input
            label="Password"
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={set('password')}
          />
          <Button type="submit" className="w-full" isLoading={isLoading}>
            Create account
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

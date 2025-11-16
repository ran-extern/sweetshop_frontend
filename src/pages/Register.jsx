import { useAuth, isUserAdmin } from '../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import AuthNav from '../components/AuthNav.jsx';

// Registration page
// - Collects name/email/password and calls `register` from AuthContext
// - Displays field-specific backend validation errors returned from the API
// - Redirects to the dashboard on successful registration

export default function RegisterPage() {
  const { register: registerUser, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/app'} replace />;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await registerUser(form);
    setLoading(false);
    if (result.ok) {
      const destination = isUserAdmin(result.user) ? '/admin' : '/app';
      navigate(destination);
    } else {
      // result.error is parsed DRF error shape
      const err = result.error;
      if (err.nonFieldErrors) setError(err.nonFieldErrors.join(' '));
      else if (err.name) setError(`Name: ${err.name.join(' ')}`);
      else if (err.email) setError(`Email: ${err.email.join(' ')}`);
      else if (err.password) setError(`Password: ${err.password.join(' ')}`);
      else setError(JSON.stringify(err));
    }
  };

  return (
    <>
      <AuthNav />
      <main className="auth-page">
        <section className="panel">
          <h1>Create an account</h1>
          <form onSubmit={handleSubmit}>
            <label>
              Full name
              <input name="name" value={form.name} onChange={handleChange} required />
            </label>
            <label>
              Email
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </label>
            <label>
              Password
              <input type="password" name="password" value={form.password} onChange={handleChange} required />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading}>{loading ? 'Signing up…' : 'Sign up'}</button>
          </form>
        </section>
      </main>
    </>
  );
}

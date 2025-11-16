import { useAuth, isUserAdmin } from '../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { useState } from 'react';
import AuthNav from '../components/AuthNav.jsx';

// Login page
// - Simple credential form that calls `login` from AuthContext
// - Surface non-field or detail errors returned by the backend so users know
//   whether their credentials are invalid or the server returned something else

export default function LoginPage() {
  const { login, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={isAdmin ? '/admin' : '/app'} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login({ email, password });
    setLoading(false);
    if (result.ok) {
      const destination = isUserAdmin(result.user) ? '/admin' : '/app';
      navigate(destination);
    } else {
      const err = result.error;
      if (err.nonFieldErrors) setError(err.nonFieldErrors.join(' '));
      else if (err.detail) setError(err.detail);
      else setError('Unable to sign in. Check credentials.');
    }
  };

  return (
    <>
      <AuthNav />
      <main className="auth-page">
        <section className="panel">
          <h1>Welcome back</h1>
          <p>Sign in with your SweetShop account.</p>
          <form onSubmit={handleSubmit}>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        </section>
      </main>
    </>
  );
}

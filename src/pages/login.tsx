import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Video } from 'lucide-react';
import { useAuth } from '../lib/auth';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

export default function Login() {
  const { user, loginWithCredentials, loginWithCognito } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // If already logged in, go to dashboard
  useEffect(() => {
    if (user) router.replace('/');
  }, [user]);

  // In real mode, redirect to Cognito immediately
  useEffect(() => {
    if (!USE_MOCK && !user) {
      // Small delay to avoid redirect loop
      const t = setTimeout(() => loginWithCognito(), 500);
      return () => clearTimeout(t);
    }
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await loginWithCredentials(email, password);
      router.replace('/');
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  // In real mode, show a "Redirecting to Cognito…" message
  if (!USE_MOCK) {
    return (
      <div className="zoom-login">
        <div className="zoom-login-card">
          <div className="zoom-logo">
            <div className="zoom-logo-icon"><Video size={22} /></div>
            <div className="zoom-logo-text">MeetingAI</div>
          </div>
          <h2>Redirecting to sign in…</h2>
          <p style={{ textAlign: 'center', color: '#6B7280' }}>
            You'll be redirected to the secure login page.
          </p>
          <button
            className="btn-primary"
            onClick={loginWithCognito}
            style={{ width: '100%', padding: 12, marginTop: 16 }}
          >
            Sign in with Cognito
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="zoom-login">
      <div className="zoom-login-card">
        <div className="zoom-logo">
          <div className="zoom-logo-icon"><Video size={22} /></div>
          <div className="zoom-logo-text">MeetingAI</div>
        </div>
        <h2>Sign In</h2>
        <form onSubmit={submit}>
          <div className="field">
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="field">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <div className="links">
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)} />
              Stay signed in
            </label>
            <a href="#">Forgot?</a>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <div className="divider">or sign in with</div>
        <button className="sso-btn" onClick={loginWithCognito}>
          <span style={{ fontWeight: 600 }}>SSO</span>
        </button>
        <button className="sso-btn" onClick={loginWithCognito}>
          <span style={{ color: '#4285F4', fontWeight: 600 }}>G</span>
          <span>Google</span>
        </button>
        <button className="sso-btn" onClick={loginWithCognito}>
          <span style={{ color: '#1877F2', fontWeight: 600 }}>f</span>
          <span>Facebook</span>
        </button>
        <div className="footer">
          New to MeetingAI? <a href="#" style={{ color: '#2D8CFF' }}>Sign Up Free</a>
        </div>
      </div>
    </div>
  );
}
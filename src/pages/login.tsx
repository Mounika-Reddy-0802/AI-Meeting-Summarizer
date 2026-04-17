import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Video, Key, User, Shield, BookOpen, Info } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { user, loginWithCredentials } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keep, setKeep] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user]);

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

  function fillDemo(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
  }

  return (
    <div className="login-page">
      {/* Left panel — demo credentials + project info */}
      <div className="login-left">
        <div className="demo-section">
          <div className="demo-header">
            <Key size={18} />
            <span>Demo Login Credentials</span>
          </div>
          <div className="demo-cards">
            <button
              className="demo-card demo-admin"
              onClick={() => fillDemo('sherymounikareddy.2006@gmail.com', 'MeetingAI@2026')}
            >
              <div className="demo-card-icon"><Shield size={16} /></div>
              <div className="demo-card-label">Host Login</div>
              <div className="demo-card-detail">Email: <b>sherymounikareddy.2006@gmail.com</b></div>
              <div className="demo-card-detail">Password: <b>MeetingAI@2026</b></div>
            </button>
            <button
              className="demo-card demo-user"
              onClick={() => fillDemo('vattipallysreshtareddy@gmail.com', 'Meeting@123')}
            >
              <div className="demo-card-icon"><User size={16} /></div>
              <div className="demo-card-label">Participant Login</div>
              <div className="demo-card-detail">Email: <b>vattipallysreshtareddy@gmail.com</b></div>
              <div className="demo-card-detail">Password: <b>Meeting@123</b></div>
            </button>
          </div>
          <p className="demo-hint">Click a card to auto-fill credentials</p>
        </div>

        <div className="project-section">
          <div className="project-header">
            <Info size={18} />
            <span>Project Information</span>
          </div>
          <div className="project-grid">
            <div className="project-field">
              <div className="project-label">PROJECT CREDITS</div>
              <div className="project-value">Mounika Reddy Shery</div>
              <div className="project-value">Saikrishna Reddy Vattipally</div>
            </div>
            <div className="project-field">
              <div className="project-label">SUPERVISOR</div>
              <div className="project-value">Dr. Naresh Vurukonda</div>
            </div>
            <div className="project-field">
              <div className="project-label">COURSE</div>
              <div className="project-value">Virtualization and Cloud Computing</div>
            </div>
            <div className="project-field">
              <div className="project-label">DEPARTMENT</div>
              <div className="project-value">Department of CSE (Data Science)</div>
              <div className="project-value">NMIMS Hyderabad Campus</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div className="login-right">
        <div className="login-form-card">
          <div className="zoom-logo">
            <div className="zoom-logo-icon"><Video size={22} /></div>
            <div className="zoom-logo-text">MeetingAI</div>
          </div>
          <h2>Sign in to your account</h2>

          <form onSubmit={submit}>
            <div className="field">
              <label>Email address</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
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
            <button className="login-submit" type="submit" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in  →'}
            </button>
          </form>

          <div className="login-footer-note">
            <Shield size={14} />
            <span>Secure Authentication Process</span>
          </div>
        </div>
      </div>
    </div>
  );
}

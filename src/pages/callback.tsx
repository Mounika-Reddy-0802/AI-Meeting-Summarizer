import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../lib/auth';

export default function Callback() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/');
    }
  }, [user, loading]);

  // Show what's happening so we can debug
  const url = typeof window !== 'undefined' ? window.location.href : '';
  const hasCode = url.includes('code=');

  return (
    <div style={{ padding: 40, fontFamily: 'system-ui' }}>
      <h2>Signing you in…</h2>
      {loading && <p>Exchanging authorization code with Cognito…</p>}
      {!loading && !user && (
        <div>
          <p style={{ color: '#DC2626' }}>
            Sign-in failed. Open browser DevTools (F12) → Console tab to see the error.
          </p>
          <p style={{ color: '#6B7280', fontSize: 13 }}>
            {hasCode
              ? 'Authorization code was received but token exchange failed. Check Console for details.'
              : 'No authorization code found in URL. Try signing in again.'}
          </p>
          <button
            onClick={() => router.replace('/login')}
            style={{
              marginTop: 12, padding: '8px 16px', background: '#2D8CFF',
              color: 'white', border: 0, borderRadius: 6, cursor: 'pointer',
            }}
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
}
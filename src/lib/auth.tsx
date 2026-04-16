import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { profileStore, Profile } from './mockStore';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

type User = Profile;
type Tokens = { idToken: string };

type Ctx = {
  user: User | null;
  tokens: Tokens | null;
  loading: boolean;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  loginWithCognito: () => void;
  logout: () => void;
  updateProfile: (p: Partial<User>) => void;
};
const C = createContext<Ctx>({} as any);

const DOMAIN = process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '';
const CLIENT = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '';
const REDIRECT = process.env.NEXT_PUBLIC_REDIRECT_URI || 'http://localhost:3000/callback';

function b64url(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pkce() {
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(32)).buffer);
  const challenge = b64url(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  );
  return { verifier, challenge };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') { setLoading(false); return; }

    // --- Mock mode: restore from localStorage ---
    if (USE_MOCK) {
      const raw = localStorage.getItem('mock_user');
      if (raw) {
        const u = JSON.parse(raw);
        const profile = profileStore.get();
        const merged = { ...u, ...profile, email: u.email };
        setUser(merged);
        setTokens({ idToken: 'mock-token' });
      }
      setLoading(false);
      return;
    }

    // --- Real mode: check for existing token in sessionStorage ---
    const existingToken = sessionStorage.getItem('cognito_id_token');
    if (existingToken) {
      try {
        const payload = JSON.parse(atob(existingToken.split('.')[1]));
        const u: User = {
          email: payload.email || '',
          name: payload.email?.split('@')[0] || 'User',
        };
        setUser(u);
        setTokens({ idToken: existingToken });
        profileStore.set(u);
      } catch {}
      setLoading(false);
      return;
    }

    // --- Real mode: handle Cognito callback ---
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const verifier = sessionStorage.getItem('pkce_verifier');

    if (code && verifier) {
      console.log('[auth] Exchanging code for tokens...');
      console.log('[auth] Cognito domain:', DOMAIN);
      console.log('[auth] Client ID:', CLIENT);
      console.log('[auth] Redirect URI:', REDIRECT);
      console.log('[auth] Verifier present:', !!verifier);

      fetch(`${DOMAIN}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: CLIENT,
          code,
          redirect_uri: REDIRECT,
          code_verifier: verifier,
        }),
      })
        .then(r => {
          console.log('[auth] Token response status:', r.status);
          return r.json();
        })
        .then(t => {
          console.log('[auth] Token response:', t.error || 'success');
          if (t.error) {
            console.error('[auth] Cognito error:', t.error, t.error_description);
            setLoading(false);
            return;
          }
          if (t.id_token) {
            // Store token in sessionStorage so page refreshes don't lose it
            sessionStorage.setItem('cognito_id_token', t.id_token);
            if (t.refresh_token) sessionStorage.setItem('cognito_refresh_token', t.refresh_token);

            setTokens({ idToken: t.id_token });
            try {
              const payload = JSON.parse(atob(t.id_token.split('.')[1]));
              const u: User = {
                email: payload.email || '',
                name: payload.email?.split('@')[0] || 'User',
              };
              setUser(u);
              profileStore.set(u);
            } catch {}
          }
          sessionStorage.removeItem('pkce_verifier');
          window.history.replaceState({}, '', '/');
          setLoading(false);
        })
        .catch(err => {
          console.error('[auth] Token exchange failed:', err);
          setLoading(false);
        });
    } else {
      if (code && !verifier) {
        console.warn('[auth] Code present but no PKCE verifier in sessionStorage. Was login started in a different tab?');
      }
      setLoading(false);
    }
  }, []);

  const loginWithCredentials = async (email: string, password: string) => {
    if (!email) throw new Error('Email required');
    if (USE_MOCK) {
      const existing = profileStore.get();
      const u: User = {
        email,
        name: existing.email === email ? existing.name : email.split('@')[0],
        role: existing.role,
        bio: existing.bio,
      };
      profileStore.set(u);
      localStorage.setItem('mock_user', JSON.stringify(u));
      setUser(u);
      setTokens({ idToken: 'mock-token' });
      return;
    }
    // In real mode, redirect to Cognito
    loginWithCognito();
  };

  const loginWithCognito = async () => {
    if (USE_MOCK || !DOMAIN || !CLIENT) {
      await loginWithCredentials('demo@example.com', '');
      return;
    }
    const { verifier, challenge } = await pkce();
    sessionStorage.setItem('pkce_verifier', verifier);
    const u = new URL(`${DOMAIN}/oauth2/authorize`);
    u.searchParams.set('client_id', CLIENT);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('redirect_uri', REDIRECT);
    u.searchParams.set('scope', 'openid email');
    u.searchParams.set('code_challenge', challenge);
    u.searchParams.set('code_challenge_method', 'S256');
    window.location.href = u.toString();
  };

  const logout = () => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('mock_user');
    sessionStorage.removeItem('cognito_id_token');
    sessionStorage.removeItem('cognito_refresh_token');
    sessionStorage.removeItem('pkce_verifier');
    if (!USE_MOCK && DOMAIN) {
      window.location.href = `${DOMAIN}/logout?client_id=${CLIENT}&logout_uri=${encodeURIComponent(window.location.origin + '/')}`;
    }
  };

  const updateProfile = (patch: Partial<User>) => {
    if (!user) return;
    const next = { ...user, ...patch };
    setUser(next);
    profileStore.set(next);
    if (USE_MOCK) localStorage.setItem('mock_user', JSON.stringify(next));
  };

  return (
    <C.Provider value={{ user, tokens, loading, loginWithCredentials, loginWithCognito, logout, updateProfile }}>
      {children}
    </C.Provider>
  );
}

export const useAuth = () => useContext(C);
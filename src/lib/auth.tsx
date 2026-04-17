import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { profileStore, Profile } from './mockStore';

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
const REDIRECT = process.env.NEXT_PUBLIC_REDIRECT_URI || '';
const POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '';

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

// Cognito region from pool ID (e.g., "ap-south-1_XxxXxx" → "ap-south-1")
function getRegion() {
  if (POOL_ID && POOL_ID.includes('_')) return POOL_ID.split('_')[0];
  if (DOMAIN) {
    const m = DOMAIN.match(/auth\.([\w-]+)\.amazoncognito/);
    if (m) return m[1];
  }
  return 'ap-south-1';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<Tokens | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') { setLoading(false); return; }

    // Check for existing token in sessionStorage
    const existingToken = sessionStorage.getItem('cognito_id_token');
    if (existingToken) {
      try {
        const payload = JSON.parse(atob(existingToken.split('.')[1]));
        // Check if token is expired
        if (payload.exp && payload.exp * 1000 > Date.now()) {
          const u: User = {
            email: payload.email || '',
            name: payload.email?.split('@')[0] || 'User',
          };
          setUser(u);
          setTokens({ idToken: existingToken });
          profileStore.set(u);
          setLoading(false);
          return;
        } else {
          sessionStorage.removeItem('cognito_id_token');
        }
      } catch {}
    }

    // Check for Cognito callback code (PKCE flow)
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const verifier = sessionStorage.getItem('pkce_verifier');
    if (code && verifier) {
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
        .then(r => r.json())
        .then(t => {
          if (t.id_token) {
            sessionStorage.setItem('cognito_id_token', t.id_token);
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
        .catch(() => setLoading(false));
      return;
    }

    setLoading(false);
  }, []);

  const loginWithCredentials = async (email: string, password: string) => {
    if (!email) throw new Error('Email required');
    if (!password) throw new Error('Password required');

    // Use Cognito InitiateAuth API directly (USER_PASSWORD_AUTH flow)
    const region = getRegion();
    const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;

    const body = {
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: CLIENT,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (data.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
      // Handle forced password change for new users
      const session = data.Session;
      const newPassRes = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.RespondToAuthChallenge',
        },
        body: JSON.stringify({
          ChallengeName: 'NEW_PASSWORD_REQUIRED',
          ClientId: CLIENT,
          Session: session,
          ChallengeResponses: {
            USERNAME: email,
            NEW_PASSWORD: password,
          },
        }),
      });
      const newPassData = await newPassRes.json();
      if (newPassData.AuthenticationResult) {
        handleAuthResult(newPassData.AuthenticationResult, email);
        return;
      }
      throw new Error('Password change failed. Please try again.');
    }

    if (data.AuthenticationResult) {
      handleAuthResult(data.AuthenticationResult, email);
      return;
    }

    // Error handling
    if (data.__type) {
      const errType = data.__type.split('#').pop();
      if (errType === 'NotAuthorizedException') throw new Error('Incorrect email or password');
      if (errType === 'UserNotFoundException') throw new Error('No account found with this email');
      if (errType === 'UserNotConfirmedException') throw new Error('Please verify your email first');
      throw new Error(data.message || errType || 'Authentication failed');
    }
    throw new Error('Authentication failed');
  };

  function handleAuthResult(result: any, email: string) {
    const idToken = result.IdToken;
    if (!idToken) throw new Error('No ID token received');

    sessionStorage.setItem('cognito_id_token', idToken);
    if (result.RefreshToken) sessionStorage.setItem('cognito_refresh_token', result.RefreshToken);

    setTokens({ idToken });
    try {
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      const u: User = {
        email: payload.email || email,
        name: payload.email?.split('@')[0] || email.split('@')[0] || 'User',
      };
      setUser(u);
      profileStore.set(u);
    } catch {
      const u: User = { email, name: email.split('@')[0] };
      setUser(u);
      profileStore.set(u);
    }
  }

  const loginWithCognito = async () => {
    if (!DOMAIN || !CLIENT) {
      throw new Error('Cognito not configured');
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
    sessionStorage.removeItem('cognito_id_token');
    sessionStorage.removeItem('cognito_refresh_token');
    sessionStorage.removeItem('pkce_verifier');
  };

  const updateProfile = (patch: Partial<User>) => {
    if (!user) return;
    const next = { ...user, ...patch };
    setUser(next);
    profileStore.set(next);
  };

  return (
    <C.Provider value={{ user, tokens, loading, loginWithCredentials, loginWithCognito, logout, updateProfile }}>
      {children}
    </C.Provider>
  );
}

export const useAuth = () => useContext(C);

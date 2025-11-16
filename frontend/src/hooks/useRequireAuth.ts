// src/hooks/useRequireAuth.ts
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE, RoleEnum } from '../lib/api';

interface MeResponse {
  authenticated: boolean;
  id: string;
  email: string;
  roles?: { name?: RoleEnum }[];
}

export function useRequireAuth() {
  const nav = useNavigate();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setAuthError(null);

        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: 'include',
        });

        console.log('[useRequireAuth] /auth/me status', res.status);

        if (!res.ok) {
          if (!cancelled) {
            // not logged in -> go to login
            nav('/', { replace: true });
          }
          return;
        }

        const data = (await res.json()) as MeResponse;
        console.log('[useRequireAuth] /auth/me data', data);

        if (!data.authenticated) {
          if (!cancelled) {
            nav('/', { replace: true });
          }
          return;
        }

        if (!cancelled) {
          setUser(data);
        }
      } catch (e: any) {
        console.error('[useRequireAuth] error', e);
        if (!cancelled) {
          setAuthError(e.message ?? 'auth error');
          nav('/', { replace: true });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nav]);

  return { user, loading, authError };
}

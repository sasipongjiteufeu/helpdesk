// src/hooks/useRequireAuth.ts
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";

type RoleName = "USER" | "AGENT" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  roles?: { name?: RoleName }[];
}

interface MeResponse {
  authenticated: boolean;
  id?: string;
  email?: string;
  name?: string | null;
  avatarUrl?: string | null;
  roles?: { name?: RoleName }[];
}

export function useRequireAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Failed to load auth (${res.status})`);
        }

        const data: MeResponse = await res.json();

        // ❌ ไม่ authenticate → เคลียร์ user + redirect ไปหน้า login (`/`)
        if (!data.authenticated || !data.email) {
          if (!cancelled) {
            setUser(null);
          }

          // อย่า loop redirect ตัวเอง (เผื่อหน้า login ใช้ hook ด้วย)
          const isOnPublicPage =
            location.pathname === "/" ||
            location.pathname === "/login" ||
            location.pathname === "/forbidden";

          if (!isOnPublicPage) {
            navigate("/login", { replace: true });
          }
          return;
        }

        // ✅ login แล้ว
        if (!cancelled) {
          setUser({
            id: data.id!,
            email: data.email,
            name: data.name ?? null,
            avatarUrl: data.avatarUrl ?? null,
            roles: data.roles ?? [],
          });
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e.message ?? "Auth error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.pathname]);

  return { user, loading, error };
}

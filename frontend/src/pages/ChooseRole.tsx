// src/pages/ChooseRole.tsx
import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

// โหลดโลโก้จาก public/
//const ARIT_LOGO = '/logo-ARIT.png';
//const SRU_LOGO = '/logo-sru-png.png';

type RoleName = "USER" | "AGENT" | "ADMIN";

interface MeResponse {
  email?: string;
  roles?: { name?: RoleName }[];
}

export default function ChooseRole() {
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });
        const data: MeResponse = await res.json();

        const names = (data?.roles || [])
          .map((r) => r?.name)
          .filter((n): n is RoleName => Boolean(n));

        setEmail(data?.email || "");

        // ถ้าผู้ใช้มีแค่ 1 role → ข้ามไปเลย
        if (names.length === 1) {
          const map: Record<RoleName, string> = {
            ADMIN: "/admin",
            AGENT: "/agent",
            USER: "/user",
          };
          window.location.replace(map[names[0]]);
          return;
        }

        setRoles(names);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const go = (r: RoleName) => {
    const map: Record<RoleName, string> = {
      ADMIN: "/admin",
      AGENT: "/agent",
      USER: "/user",
    };
    window.location.replace(map[r]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
      <div className="w-full max-w-[480px] bg-white rounded-2xl px-8 pt-8 pb-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)] text-center">
        {/* โลโก้ ARIT + SRU */}
        <div className="flex items-center justify-center gap-6 mb-5">
          <img
            src="/logo-ARIT.png"
            alt="ARIT Logo"
            className="h-[70px] object-contain animate__animated animate__fadeInUp animate__fast"
          />
          <img
            src="/logo-sru-png.png"
            alt="Suratthani Rajabhat University Logo"
            className="h-[110px] object-contain animate__animated animate__fadeInUp animate__fast"
          />
        </div>

        <div className="mb-1">
          <p className="role-greeting">Welcome!</p>
          {email && <p className="role-email">{email}</p>}
          <p className="role-subtext">กรุณาเลือกรูปแบบการเข้าใช้งานระบบ</p>
        </div>

        <div>
          {loading && <p className="role-loading">กำลังโหลดสิทธิ์การใช้งาน…</p>}

          <div className="flex justify-center items-center gap-2">
            {!loading &&
              roles.map((r) => (
                <button
                  className="text-white bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-purple-300 dark:focus:ring-purple-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
                  onClick={() => go(r)}
                  key={r}
                >
                  {r}
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

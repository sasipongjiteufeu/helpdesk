// src/pages/ChooseRole.tsx
import { useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';

// โหลดโลโก้จาก public/
const ARIT_LOGO = '/logo-ARIT.png';
const SRU_LOGO = '/logo-sru-png.png';

type RoleName = 'USER' | 'AGENT' | 'ADMIN';

interface MeResponse {
  email?: string;
  roles?: { name?: RoleName }[];
}

export default function ChooseRole() {
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
        const data: MeResponse = await res.json();

        const names = (data?.roles || [])
          .map((r) => r?.name)
          .filter((n): n is RoleName => Boolean(n));

        setEmail(data?.email || '');

        // ถ้าผู้ใช้มีแค่ 1 role → ข้ามไปเลย
        if (names.length === 1) {
          const map: Record<RoleName, string> = {
            ADMIN: '/admin',
            AGENT: '/agent',
            USER: '/user',
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
      ADMIN: '/admin',
      AGENT: '/agent',
      USER: '/user',
    };
    window.location.replace(map[r]);
  };

  return (
    <div className="role-page">
      <div className="role-card">
        
        {/* โลโก้สองตัวตรงกลาง */}
        <div className="login-logos" style={{ marginBottom: '16px' }}>
          <img src={ARIT_LOGO} alt="ARIT Logo" style={{ height: '70px' }} />
          <img src={SRU_LOGO} alt="SRU Logo" style={{ height: '90px' }} />
        </div>

        <div className="role-welcome">
          <p className="role-greeting">Welcome!</p>
          {email && <p className="role-email">{email}</p>}
          <p className="role-subtext">กรุณาเลือกรูปแบบการเข้าใช้งานระบบ</p>
        </div>

        <div className="role-buttons">
          {loading && <p className="role-loading">กำลังโหลดสิทธิ์การใช้งาน…</p>}

          {!loading &&
            roles.map((r) => (
              <button key={r} className="role-button" onClick={() => go(r)}>
                {r}
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}

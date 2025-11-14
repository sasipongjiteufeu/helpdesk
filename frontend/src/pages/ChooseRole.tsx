// src/pages/ChooseRole.tsx
import { useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';

type RoleName = 'USER'|'AGENT'|'ADMIN';
export default function ChooseRole() {
  const [roles, setRoles] = useState<RoleName[]>([]);
  useEffect(() => {
    (async () => {
      const res = await fetch(`${API_BASE}/auth/me`, { credentials:'include' });
      const data = await res.json().catch(() => null);
      const names = (data?.roles || []).map((r:any) => r?.name).filter(Boolean);
      setRoles(names);
    })();
  }, []);

  const go = (r: RoleName) => {
    const map: Record<RoleName,string> = { ADMIN:'/admin', AGENT:'/agent', USER:'/user' };
    window.location.replace(map[r]);
  };

  return (
    <div style={{minHeight:'100dvh',display:'grid',placeItems:'center',gap:'1rem',fontFamily:'system-ui'}}>
      <div style={{display:'flex',gap:'1rem'}}>
        {roles.length === 0 && <p>Loading roles…</p>}
        {roles.map((r) => (
          <button key={r}
            onClick={() => go(r as RoleName)}
            style={{padding:'1rem 1.2rem',borderRadius:'0.7rem',border:'1px solid #cbd5e1',fontWeight:700,cursor:'pointer'}}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

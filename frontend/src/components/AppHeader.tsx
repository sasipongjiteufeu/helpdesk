// src/components/AppHeader.tsx
import { API_BASE } from '../lib/api';
import { AuthUser } from '../hooks/useRequireAuth';

interface Props {
  user: AuthUser;
  title: string; // เช่น "HelpDesk", "HelpDesk – Agent"
}

export function AppHeader({ user, title }: Props) {
  const avatarSrc = user.avatarUrl || '/default-avatar.png'; // ใส่ default ใน public ด้วย

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #e5e7eb',
        paddingBottom: '12px',
      }}
    >
      {/* โลโก้ HelpDesk */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src="/logo-sru-png.png"
          alt="SRU Logo"
          style={{ height: 58, width: 'auto' }}
        />
        <span style={{ fontSize: '1.7rem', fontWeight: 700 }}>{title}</span>
      </div>

      {/* โปรไฟล์ขวาบน */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src={avatarSrc}
          alt={user.name || user.email}
          style={{
            width: 36,
            height: 36,
            borderRadius: '999px',
            objectFit: 'cover',
            border: '1px solid #d1d5db',
          }}
          onError={e => {
            // กันกรณีรูปจาก Google พัง → ใช้ default
            (e.currentTarget as HTMLImageElement).src = '/default-avatar.png';
          }}
        />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            {user.name || user.email}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{user.email}</div>
        </div>

        <button
          type="button"
          onClick={() => (window.location.href = `${API_BASE}/auth/logout`)}
          style={{
            padding: '6px 14px',
            borderRadius: '999px',
            border: '1px solid #d1d5db',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

// src/pages/AdminAssignRolesPage.tsx
import React, { useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useNavigate } from 'react-router-dom';

type RoleName = 'USER' | 'AGENT' | 'ADMIN';

interface AdminUserRow {
  id: string;
  email: string;
  roles: RoleName[];
  ticketCount: number;
}

export default function AdminAssignRolesPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/admin/users`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
        const data = (await res.json()) as AdminUserRow[];
        setRows(data);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? 'โหลดรายชื่อผู้ใช้ไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (authLoading || !user) {
    return <div style={{ padding: 40 }}>Checking your access…</div>;
  }

  async function saveRoles(userId: string, roles: RoleName[]) {
    try {
      setSavingUserId(userId);
      const res = await fetch(`${API_BASE}/admin/users/${userId}/roles`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roles }),
      });
      if (!res.ok) throw new Error(`ไม่สามารถบันทึกสิทธิ์ได้ (${res.status})`);
      const updated = await res.json();
      setRows(prev =>
        prev.map(r =>
          r.id === userId ? { ...r, roles: updated.roles as RoleName[] } : r,
        ),
      );
    } catch (e: any) {
      alert(e.message ?? 'บันทึกสิทธิ์ไม่สำเร็จ');
    } finally {
      setSavingUserId(null);
    }
  }

  function toggleRole(row: AdminUserRow, role: RoleName) {
    const has = row.roles.includes(role);
    const nextRoles = has
      ? row.roles.filter(r => r !== role)
      : [...row.roles, role];

    // simple optimistic UI
    setRows(prev =>
      prev.map(r => (r.id === row.id ? { ...r, roles: nextRoles } : r)),
    );
    void saveRoles(row.id, nextRoles);
  }

  const filteredRows = rows.filter(r =>
    r.email.toLowerCase().includes(searchEmail.trim().toLowerCase()),
  );

  // styling
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f3f4f6',
    padding: '24px',
    boxSizing: 'border-box',
    fontFamily: 'system-ui',
  };

  const shellStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 18px 40px rgba(0,0,0,0.15)',
    padding: '20px',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '12px',
  };

  const logoRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={logoRowStyle}>
            <img
              src="/logo-sru-png.png"
              alt="SRU Logo"
              style={{ height: 58, width: 'auto' }}
            />
            <span style={{ fontSize: '1.7rem', fontWeight: 700 }}>
              HelpDesk – Admin
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span>{user.email}</span>
            <button
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

        <div style={{ marginTop: 16 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <h2 style={{ margin: 0 }}>มอบหมายสิทธิ์การเข้าถึง</h2>

            <input
              type="text"
              placeholder="ค้นหา Email"
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '999px',
                border: '1px solid #d1d5db',
                fontSize: '0.9rem',
                minWidth: '240px',
              }}
            />
          </div>

          {error && (
            <p style={{ color: 'red', marginTop: 8 }}>{error}</p>
          )}

          <div
            style={{
              marginTop: 12,
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              padding: '12px',
              overflowX: 'auto',
            }}
          >
            {loading ? (
              <p>กำลังโหลด...</p>
            ) : filteredRows.length === 0 ? (
              <p>ไม่พบผู้ใช้</p>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.9rem',
                }}
              >
                <thead>
                  <tr style={{ background: '#e5e7eb' }}>
                    <th style={th}>Email</th>
                    <th style={th}>จำนวนคำร้อง</th>
                    <th style={th}>USER</th>
                    <th style={th}>AGENT</th>
                    <th style={th}>ADMIN</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map(r => (
                    <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={td}>{r.email}</td>
                      <td style={td}>{r.ticketCount}</td>
                      {(['USER', 'AGENT', 'ADMIN'] as RoleName[]).map(role => (
                        <td key={role} style={tdCenter}>
                          <input
                            type="checkbox"
                            checked={r.roles.includes(role)}
                            disabled={savingUserId === r.id}
                            onChange={() => toggleRole(r, role)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button
            type="button"
            onClick={() => nav('/admin')}
            style={{
              marginTop: 16,
              padding: '7px 16px',
              borderRadius: '999px',
              border: '1px solid #d1d5db',
              background: '#fff',
              cursor: 'pointer',
            }}
          >
            กลับหน้าหลัก Admin
          </button>
        </div>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '8px',
  borderBottom: '1px solid #d1d5db',
  whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
  padding: '6px 8px',
};

const tdCenter: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'center',
};

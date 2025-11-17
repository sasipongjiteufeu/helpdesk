// src/pages/User.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import { useRequireAuth } from '../hooks/useRequireAuth';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;

  // from old design
  assignedTo?: { email?: string | null } | null;

  // ✅ NEW: who changed status last (Option A)
  lastStatusChangedBy?: { email?: string | null } | null;
}

export default function UserTicketsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/tickets?page=1&limit=50`, {
        credentials: 'include',
      });
      const data = await res.json();
      setTickets(data.items ?? []);
    } catch (e: any) {
      setError(e.message || 'fetch error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  if (authLoading || !user) {
    return <div style={{ padding: 40 }}>Checking your access…</div>;
  }

  async function handleDelete(id: number) {
    if (!confirm('ต้องการลบคำร้องนี้หรือไม่?')) return;
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        alert(`ไม่สามารถลบคำร้องได้ (status code ${res.status})`);
        return;
      }
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      alert(e.message ?? 'ลบคำร้องไม่สำเร็จ');
    }
  }

  // ====== UI ======
  const pageStyle = {
    minHeight: '100vh',
    background: '#f3f4f6',
    padding: '24px',
    boxSizing: 'border-box',
    fontFamily: 'system-ui',
  } as const;

  const shellStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 18px 40px rgba(0,0,0,0.15)',
    padding: '20px',
  } as const;

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb',
    paddingBottom: '12px',
  } as const;

  const logoRowStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  } as const;

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={logoRowStyle}>
            <img
              src="/logo-sru-png.png"
              alt="SRU Logo"
              style={{
                height: '58px',
                width: 'auto',
              }}
            />
            <span style={{ fontSize: '1.7rem', fontWeight: 700 }}>HelpDesk</span>
          </div>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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

        {/* Section Title */}
        <div
          style={{
            marginTop: 16,
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ margin: 0 }}>รายการคำร้องของฉัน</h2>

          <button
            onClick={() => nav('/user/create')}
            style={{
              padding: '7px 16px',
              background: '#22c55e',
              borderRadius: '999px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            + Create Ticket
          </button>
        </div>

        {/* Error */}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {/* Ticket Table */}
        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          {loading ? (
            <p>Loading…</p>
          ) : tickets.length === 0 ? (
            <p>ยังไม่มีรายการคำร้อง</p>
          ) : (
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr>
                  <th style={th}>สถานะคำร้อง</th>
                  <th style={th}>Ticket ID</th>
                  <th style={th}>หัวข้อ</th>
                  <th style={th}>รายระเอียดคำร้อง</th>
                  <th style={th}>เบอร์ติดต่อ</th>
                  {/* 👇 still same column, but now shows lastStatusChangedBy */}
                  <th style={th}>รับงาน / แก้ไขสถานะโดย</th>
                  <th style={th}>สร้าง ณ วันที่</th>
                  <th style={th}>ตัวเลือก</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => {
                  // delete rule: only when still OPEN and no one assigned
                  const canDelete = t.status === 'OPEN' && !t.assignedTo;

                  // show who changed status, fallback to assignedTo if needed
                  const statusChangerEmail =
                    t.lastStatusChangedBy?.email || t.assignedTo?.email || '-';

                  return (
                    <tr key={t.id}>
                      <td style={td}>
                        <span style={getStatusStyle(t.status)}>{t.status}</span>
                      </td>
                      <td style={td}>{String(t.id).padStart(7, '0')}</td>
                      <td style={td}>{t.title}</td>
                      <td style={td}>{t.detail}</td>
                      <td style={td}>{t.tel ?? '-'}</td>
                      <td style={td}>{statusChangerEmail}</td>
                      <td style={td}>{new Date(t.createdAt).toLocaleString()}</td>
                      <td style={td}>
                        <div
                          style={{
                            display: 'flex',
                            gap: '0.5rem',
                            justifyContent: 'flex-start',
                          }}
                        >
                          <button
                            onClick={() => nav(`/user/ticket/${t.id}`)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              border: '1px solid #d1d5db',
                              background: '#ffffff',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                            }}
                          >
                            Info
                          </button>

                          <button
                            type="button"
                            onClick={canDelete ? () => handleDelete(t.id) : undefined}
                            disabled={!canDelete}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '999px',
                              border: 'none',
                              background: canDelete ? '#ef4444' : '#e5e7eb',
                              color: canDelete ? '#f9fafb' : '#9ca3af',
                              fontSize: '0.8rem',
                              cursor: canDelete ? 'pointer' : 'not-allowed',
                            }}
                            title={
                              canDelete
                                ? 'ลบคำร้อง'
                                : 'ไม่สามารถลบได้เมื่อคำร้องกำลังดำเนินการหรือปิดแล้ว หรือมีเจ้าหน้าที่รับงานแล้ว'
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

const th = {
  textAlign: 'left',
  padding: '8px',
  borderBottom: '2px solid #1f2937',
} as const;

const td = {
  padding: '8px',
  borderBottom: '1px solid #d1d5db',
} as const;

function getStatusStyle(status: string): React.CSSProperties {
  const base = {
    padding: '4px 10px',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: '0.8rem',
    display: 'inline-block',
  } as React.CSSProperties;

  switch (status) {
    case 'OPEN':
      return { ...base, background: '#facc15', color: '#000' }; // เหลือง
    case 'IN_PROGRESS':
      return { ...base, background: '#3b82f6', color: '#fff' }; // น้ำเงิน
    case 'RESOLVED':
      return { ...base, background: '#22c55e', color: '#fff' }; // เขียว
    default:
      return base;
  }
}

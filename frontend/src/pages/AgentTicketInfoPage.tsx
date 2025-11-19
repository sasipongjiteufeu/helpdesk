// src/pages/AgentTicketInfoPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import { useRequireAuth } from '../hooks/useRequireAuth';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

interface TicketUserRef {
  email?: string | null;
}

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
  createdBy?: TicketUserRef | null;
  assignedTo?: TicketUserRef | null;
  lastStatusChangedBy?: TicketUserRef | null;
}

interface TicketImageDto {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  size?: number | null;
  base64: string;
}

// ----- helper: preview attachment (image / video / download) -----
function MediaPreview({ file }: { file: TicketImageDto }) {
  const { mimeType, base64, filename } = file;
  const safeMime = mimeType || 'application/octet-stream';
  const src = `data:${safeMime};base64,${base64}`;

  if (safeMime.startsWith('image/')) {
    return (
      <img
        src={src}
        alt={filename || 'Ticket image'}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }

  if (safeMime.startsWith('video/')) {
    return (
      <video
        controls
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      >
        <source src={src} type={safeMime} />
        Your browser does not support the video tag.
      </video>
    );
  }

  // pdf / doc / etc. → download button
  return (
    <div style={{ padding: 12, textAlign: 'center', fontSize: '0.9rem' }}>
      <div style={{ marginBottom: 8 }}>{filename || 'แนบไฟล์'}</div>
      <a
        href={src}
        download={filename || 'attachment'}
        style={{
          display: 'inline-block',
          padding: '6px 12px',
          borderRadius: '999px',
          border: '1px solid #4b5563',
          textDecoration: 'none',
          background: '#111827',
          color: '#f9fafb',
          fontSize: '0.85rem',
          fontWeight: 600,
        }}
      >
        Download
      </a>
    </div>
  );
}

export default function AgentTicketInfoPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<TicketImageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Ticket info
        const ticketRes = await fetch(`${API_BASE}/tickets/${id}`, {
          credentials: 'include',
        });
        if (!ticketRes.ok) {
          throw new Error(`Failed to load ticket (${ticketRes.status})`);
        }
        const ticketData = (await ticketRes.json()) as Ticket;
        if (!cancelled) setTicket(ticketData);

        // Attachments
        const imgRes = await fetch(`${API_BASE}/tickets/${id}/images`, {
          credentials: 'include',
        });
        if (!imgRes.ok) {
          if (!cancelled) setAttachments([]);
        } else {
          const imgs = (await imgRes.json()) as TicketImageDto[];
          if (!cancelled) setAttachments(imgs);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e.message ?? 'Failed to load ticket');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (authLoading || !user) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
          background: '#f3f4f6',
          color: '#111827',
        }}
      >
        Checking your access…
      </div>
    );
  }

  function handleExit() {
    nav('/agent');
  }

  // ===== styling =====
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

  const mainAreaStyle: React.CSSProperties = {
    marginTop: 16,
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
              HelpDesk – Agent
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span>{user.email}</span>
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

        {/* Content */}
        <div style={mainAreaStyle}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>Ticket info</h2>

          {error && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                background: '#fee2e2',
                color: '#7f1d1d',
                fontSize: '0.9rem',
              }}
            >
              {error}
            </div>
          )}

          {loading || !ticket ? (
            <p>กำลังดาวโหลด...</p>
          ) : (
            <section
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                padding: '16px 18px',
                display: 'grid',
                gridTemplateColumns: 'minmax(260px, 320px) 1fr',
                gap: '1.5rem',
              }}
            >
              {/* LEFT: attachments */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  maxHeight: '70vh',
                  overflowY: 'auto',
                  paddingRight: '0.25rem',
                }}
              >
                {attachments.length === 0 ? (
                  <div style={attachmentBoxStyle}>
                    <span>ไม่มีไฟล์แนบ</span>
                  </div>
                ) : (
                  attachments.map(file => (
                    <div key={file.id} style={attachmentBoxStyle}>
                      <MediaPreview file={file} />
                    </div>
                  ))
                )}
              </div>

              {/* RIGHT: all ticket info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <Field label="Ticket ID" value={String(ticket.id).padStart(7, '0')} />
                <Field label="หัวข้อ" value={ticket.title} />
                <Field label="รายละเอียดคำร้อง" value={ticket.detail} />
                <Field label="เบอร์ติดต่อ" value={ticket.tel || '-'} />

                <div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>สถานะคำร้อง</div>
                  <div>
                    <span style={getStatusStyle(ticket.status)}>
                      {ticket.status}
                    </span>
                  </div>
                </div>

                <Field
                  label="ผู้ร้องขอ"
                  value={ticket.createdBy?.email || '-'}
                />
                <Field
                  label="รับงานโดย"
                  value={
                    ticket.assignedTo?.email
                      ? ticket.assignedTo.email
                      : 'ยังไม่มีเจ้าหน้าที่รับงาน'
                  }
                />
                <Field
                  label="เปลี่ยนสถานะล่าสุดโดย"
                  value={ticket.lastStatusChangedBy?.email || 'ยังไม่มีเจ้าหน้าที่รับงาน'}
                />
                <Field
                  label="สร้าง ณ วันที่"
                  value={new Date(ticket.createdAt).toLocaleString()}
                />
                <Field
                  label="แก้ไขล่าสุด"
                  value={
                    ticket.updatedAt
                      ? new Date(ticket.updatedAt).toLocaleString()
                      : '-'
                  }
                />

                <div style={{ marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={handleExit}
                    style={{
                      padding: '0.6rem 1.4rem',
                      borderRadius: '999px',
                      border: 'none',
                      background: '#22c55e',
                      color: '#020617',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    กลับไปหน้า Agent
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: '1rem' }}>{value}</div>
    </div>
  );
}

const attachmentBoxStyle: React.CSSProperties = {
  width: '100%',
  aspectRatio: '4 / 3',
  borderRadius: '0.75rem',
  border: '1px solid #d1d5db',
  overflow: 'hidden',
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.9rem',
  color: '#6b7280',
};

function getStatusStyle(status: TicketStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: '4px 10px',
    borderRadius: '999px',
    fontWeight: 600,
    fontSize: '0.8rem',
    display: 'inline-block',
  };
  switch (status) {
    case 'OPEN':
      return { ...base, background: '#facc15', color: '#000000' };
    case 'IN_PROGRESS':
      return { ...base, background: '#3b82f6', color: '#f8f8f8ff' };
    case 'RESOLVED':
      return { ...base, background: '#22c55e', color: '#f8f8f8ff' };
    default:
      return base;
  }
}

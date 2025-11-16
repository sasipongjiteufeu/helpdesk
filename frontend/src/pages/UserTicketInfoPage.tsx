// src/pages/UserTicketInfoPage.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import { useRequireAuth } from '../hooks/useRequireAuth';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

interface Ticket {
  id: string;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  assignedTo?: { email?: string | null } | null;
}

interface TicketImageDto {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  size?: number | null;
  base64: string;
}

export default function UserTicketInfoPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [images, setImages] = useState<TicketImageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // โหลดข้อมูล ticket + รูป
  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const ticketRes = await fetch(`${API_BASE}/tickets/${id}`, {
          credentials: 'include',
        });
        if (!ticketRes.ok) {
          throw new Error(`Failed to load ticket (${ticketRes.status})`);
        }
        const ticketData = (await ticketRes.json()) as Ticket;
        if (!cancelled) setTicket(ticketData);

        const imgRes = await fetch(`${API_BASE}/tickets/${id}/images`, {
          credentials: 'include',
        });
        if (!imgRes.ok) {
          if (!cancelled) setImages([]);
        } else {
          const imgs = (await imgRes.json()) as TicketImageDto[];
          if (!cancelled) setImages(imgs);
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
    nav('/user');
  }

  // ===== style เหมือน User =====
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
            <span style={{ fontSize: '1.7rem', fontWeight: 700 }}>HelpDesk</span>
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
            <p>Loading…</p>
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
              {/* LEFT: all images */}
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
                {images.length === 0 ? (
                  <div style={imageBoxStyle}>
                    <span>No image</span>
                  </div>
                ) : (
                  images.map(img => (
                    <div key={img.id} style={imageBoxStyle}>
                      <img
                        src={`data:${img.mimeType || 'image/*'};base64,${img.base64}`}
                        alt={img.filename || 'Ticket image'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* RIGHT: text info */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <Field label="Ticket ID" value={ticket.id} />
                <Field label="Title" value={ticket.title} />
                <Field label="Detail" value={ticket.detail} />
                <Field label="Tel" value={ticket.tel || '-'} />
                <Field label="Status" value={ticket.status} />
                <Field
                  label="Commit by"
                  value={ticket.assignedTo?.email || 'waiting'}
                />
                <Field
                  label="Created at"
                  value={new Date(ticket.createdAt).toLocaleString()}
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
                    Exit
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

const imageBoxStyle: React.CSSProperties = {
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

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/api';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

interface Ticket {
  id: string;
  title: string;
  detail: string;
  status: TicketStatus;
  createdAt: string;
  tel?: string | null;
}

export default function UserTicketsPage() {
  const nav = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/tickets/my`, {
        credentials: 'include',
      });

      if (res.status === 404) {
        setTickets([]); // no tickets yet, not an error
        return;
      }

      if (!res.ok) throw new Error(`Failed to load tickets (${res.status})`);
      const data = await res.json();
      setTickets(data as Ticket[]);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this ticket?')) return;
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to delete ticket (${res.status})`);
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (e) {
      console.error(e);
      alert('Delete failed');
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Arial',
        background: '#0f172a',
        color: '#e2e8f0',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>My Tickets</h1>

      {/* green "Create" button */}
      <button
        onClick={() => nav('/user/create')}
        style={{
          marginBottom: '1rem',
          padding: '0.4rem 1rem',
          borderRadius: '999px',
          border: 'none',
          background: '#22c55e',
          color: '#020617',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        + Create ticket
      </button>

      {error && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: '#7f1d1d',
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          background: '#020617',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #1f2937',
        }}
      >
        {loading ? (
          <p>Loading…</p>
        ) : tickets.length === 0 ? (
          <p>You don’t have any tickets yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.9rem',
              }}
            >
              <thead>
                <tr>
                  <th style={th}>Title</th>
                  <th style={th}>Status</th>
                  <th style={th}>Tel</th>
                  <th style={th}>Created</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td style={td}>{t.title}</td>
                    <td style={td}>{t.status}</td>
                    <td style={td}>{t.tel ?? '-'}</td>
                    <td style={td}>{new Date(t.createdAt).toLocaleString()}</td>
                    <td style={td}>
                      <button
                        onClick={() => handleDelete(t.id)}
                        style={{
                          padding: '0.25rem 0.7rem',
                          borderRadius: '999px',
                          border: 'none',
                          background: '#ef4444',
                          color: '#f9fafb',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '0.5rem',
  borderBottom: '1px solid #1f2937',
};

const td: React.CSSProperties = {
  padding: '0.5rem',
  borderBottom: '1px solid #111827',
};

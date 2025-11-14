import { useEffect, useState, FormEvent } from 'react';
import { API_BASE } from '../lib/api';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  createdAt: string;
}

export default function UserPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 1) load own tickets
  async function loadTickets() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/tickets/my`, {
        credentials: 'include',
      });
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

  // 2) create ticket
  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      setError(null);
      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });
      if (!res.ok) throw new Error(`Failed to create ticket (${res.status})`);

      setTitle('');
      setDescription('');
      await loadTickets(); // reload list
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  }

  // 3) delete own ticket
  async function handleDelete(id: string) {
    if (!confirm('Delete this ticket?')) return;
    try {
      setDeletingId(id);
      setError(null);
      const res = await fetch(`${API_BASE}/tickets/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Failed to delete ticket (${res.status})`);
      // optimistic update
      setTickets(prev => prev.filter(t => t.id !== id));
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Failed to delete ticket');
    } finally {
      setDeletingId(null);
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
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem' }}>User – Tickets</h1>

      {/* Create form */}
      <section
        style={{
          background: '#020617',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          marginBottom: '2rem',
          border: '1px solid #1f2937',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Create Ticket</h2>
        <form
          onSubmit={handleCreate}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
        >
          <input
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #4b5563',
              background: '#020617',
              color: 'inherit',
            }}
            required
          />
          <textarea
            placeholder="Describe your problem…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '0.5rem',
              border: '1px solid #4b5563',
              background: '#020617',
              color: 'inherit',
              resize: 'vertical',
            }}
          />
          <button
            type="submit"
            disabled={creating}
            style={{
              alignSelf: 'flex-start',
              padding: '0.5rem 1.2rem',
              borderRadius: '999px',
              border: 'none',
              background: creating ? '#4b5563' : '#22c55e',
              color: '#020617',
              fontWeight: 600,
              cursor: creating ? 'default' : 'pointer',
            }}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
      </section>

      {/* Error */}
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

      {/* Tickets table */}
      <section
        style={{
          background: '#020617',
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: '1px solid #1f2937',
        }}
      >
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>My Tickets</h2>

        {loading ? (
          <p>Loading…</p>
        ) : tickets.length === 0 ? (
          <p>No tickets yet.</p>
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
                  <th style={th}>Created</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td style={td}>{t.title}</td>
                    <td style={td}>{t.status}</td>
                    <td style={td}>{new Date(t.createdAt).toLocaleString()}</td>
                    <td style={td}>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        style={{
                          padding: '0.25rem 0.7rem',
                          borderRadius: '999px',
                          border: 'none',
                          background: '#ef4444',
                          color: '#f9fafb',
                          fontSize: '0.8rem',
                          cursor: deletingId === t.id ? 'default' : 'pointer',
                        }}
                      >
                        {deletingId === t.id ? 'Deleting…' : 'Delete'}
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

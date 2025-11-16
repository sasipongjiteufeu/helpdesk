// src/pages/UserCreateTicketPage.tsx
import React, { FormEvent, ChangeEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function UserCreateTicketPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const [title, setTitle] = useState('');
  const [detail, setDetail] = useState('');
  const [telephone, setTelephone] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setFiles(prev => [...prev, ...selected]);
    e.target.value = '';
  }

  function handleRemoveFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }

  // 🔢 จำกัดเบอร์โทร: ตัวเลขเท่านั้น และไม่เกิน 10 หลัก
  function handleTelephoneChange(e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, ''); // เอาเฉพาะตัวเลข
    const limited = digitsOnly.slice(0, 10);   // ตัดให้เหลือ 10 ตัว
    setTelephone(limited);
  }

  // helper เล็ก ๆ กัน input แปลก ๆ นิดหน่อย (trim และตัด length)
  function sanitizeText(input: string, maxLen: number) {
    return input.trim().slice(0, maxLen);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setCreating(true);
      setError(null);

      const safeTitle = sanitizeText(title, 200);
      const safeDetail = sanitizeText(detail, 2000);
      const safeTel = sanitizeText(telephone, 10); // เผื่อ safety อีกชั้น

      const form = new FormData();
      form.append('title', safeTitle);
      form.append('detail', safeDetail);
      if (safeTel) form.append('telephone', safeTel);

      files.forEach(f => form.append('pictures', f));

      const res = await fetch(`${API_BASE}/tickets`, {
        method: 'POST',
        credentials: 'include',
        body: form,
      });
      if (!res.ok) throw new Error(`Failed to create ticket (${res.status})`);

      nav('/user', { replace: true });
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'Failed to create ticket');
    } finally {
      setCreating(false);
    }
  }

  function handleCancel() {
    nav('/user');
  }

  // ===== UI style เดียวกับหน้า User =====
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

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.25rem',
    fontSize: '0.9rem',
    fontWeight: 600,
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

        {/* Content card */}
        <div
          style={{
            marginTop: 16,
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            background: '#f9fafb',
            padding: '18px 20px',
          }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>สร้างคำร้องใหม่</h2>

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

          <form onSubmit={handleSubmit}>
            {/* Title */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={200}
                style={inputStyle}
                required
              />
            </div>

            {/* Detail */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Detail</label>
              <textarea
                value={detail}
                onChange={e => setDetail(e.target.value)}
                maxLength={2000}
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              />
            </div>

            {/* Tel */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Tel (10 digits)</label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="\d{0,10}"
                maxLength={10}
                value={telephone}
                onChange={handleTelephoneChange}
                style={inputStyle}
                placeholder="0XXXXXXXXX"
              />
            </div>

            {/* Upload */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>แนบรูปภาพ (ถ้ามี)</label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                style={{ fontSize: '0.9rem' }}
              />

              {files.length > 0 && (
                <div
                  style={{
                    marginTop: '0.5rem',
                    borderRadius: '0.75rem',
                    border: '1px solid #d1d5db',
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    background: '#ffffff',
                  }}
                >
                  {files.map((f, idx) => (
                    <div
                      key={`${f.name}-${idx}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.85rem',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '999px',
                          border: 'none',
                          background: '#ef4444',
                          color: '#f9fafb',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        title="Remove file"
                      >
                        ×
                      </button>
                      <span
                        style={{
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {f.name}
                      </span>
                      <span style={{ opacity: 0.7 }}>
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '1rem',
              }}
            >
              <button
                type="submit"
                disabled={creating}
                style={{
                  padding: '0.5rem 1.2rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: creating ? '#9ca3af' : '#22c55e',
                  color: '#020617',
                  fontWeight: 600,
                  cursor: creating ? 'default' : 'pointer',
                }}
              >
                {creating ? 'Creating…' : 'Create'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '0.5rem 1.2rem',
                  borderRadius: '999px',
                  border: '1px solid #d1d5db',
                  background: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  borderRadius: '0.5rem',
  border: '1px solid #d1d5db',
  background: '#ffffff',
  color: '#111827',
  fontSize: '0.9rem',
};

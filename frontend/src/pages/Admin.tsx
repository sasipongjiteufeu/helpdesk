// src/pages/AdminPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../lib/api';
import { useRequireAuth } from '../hooks/useRequireAuth';

export default function AdminPage() {
  const { user, loading } = useRequireAuth();
  const nav = useNavigate();

  if (loading || !user) {
    return <div style={{ padding: 40 }}>Checking your access…</div>;
  }

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

  const cardStyle: React.CSSProperties = {
    marginTop: 20,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: '16px',
  };

  const buttonCard: React.CSSProperties = {
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    padding: '18px',
    background: '#f9fafb',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  };

  const mainBtn: React.CSSProperties = {
    marginTop: 12,
    padding: '10px 16px',
    borderRadius: '999px',
    border: 'none',
    background: '#22c55e',
    color: '#020617',
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
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
          <h2 style={{ marginTop: 0 }}>เมนูผู้ดูแลระบบ</h2>

          <div style={cardStyle}>
            <div style={buttonCard}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>มอบหมายสิทธิ์การเข้าถึง</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563' }}>
                  ดูรายชื่อผู้ใช้ทั้งหมด จำนวนคำร้องของแต่ละคน และกำหนดสิทธิ์ USER / AGENT / ADMIN
                </p>
              </div>
              <button
                style={mainBtn}
                onClick={() => nav('/admin/roles')}
              >
                เปิดหน้ามอบหมายสิทธิ์
              </button>
            </div>

            <div style={buttonCard}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 4 }}>แสดงผล</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#4b5563' }}>
                  ดูสถิติคำร้องเป็นกราฟ แยกตามเดือนและสถานะ OPEN / IN_PROGRESS / RESOLVED
                </p>
              </div>
              <button
                style={mainBtn}
                onClick={() => nav('/admin/stats')}
              >
                เปิดหน้าแสดงผล
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

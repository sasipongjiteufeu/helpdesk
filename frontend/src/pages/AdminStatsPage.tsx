// src/pages/AdminStatsPage.tsx
import React, { useEffect, useState } from 'react';
import { API_BASE } from '../lib/api';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useNavigate } from 'react-router-dom';

interface MonthlyItem {
  month: number;
  count: number;
}

interface YearStats {
  year: number;
  monthly: MonthlyItem[];
}

interface MonthStatusStats {
  OPEN: number;
  IN_PROGRESS: number;
  RESOLVED: number;
}

export default function AdminStatsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStatusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll(targetYear: number) {
    try {
      setLoading(true);
      setError(null);

      const [ysRes, msRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats/year?year=${targetYear}`, {
          credentials: 'include',
        }),
        fetch(
          `${API_BASE}/admin/stats/month?year=${targetYear}&month=${now.getMonth() + 1}`,
          { credentials: 'include' },
        ),
      ]);

      if (!ysRes.ok) throw new Error(`โหลดข้อมูลปีไม่สำเร็จ (${ysRes.status})`);
      if (!msRes.ok) throw new Error(`โหลดข้อมูลเดือนไม่สำเร็จ (${msRes.status})`);

      const ysJson = (await ysRes.json()) as YearStats;
      const msJson = (await msRes.json()) as MonthStatusStats;

      setYearStats(ysJson);
      setMonthStats(msJson);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? 'โหลดข้อมูลสถิติไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  if (authLoading || !user) {
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

  const graphGrid: React.CSSProperties = {
    marginTop: 16,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 2.2fr) minmax(0, 1.2fr)',
    gap: 20,
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 16,
    border: '1px solid #e5e7eb',
    background: '#f9fafb',
    padding: '16px 18px',
  };

  const monthName = now.toLocaleString('th-TH', { month: 'long' });

  // prepare graph data
  const monthly = yearStats?.monthly ?? [];
  const maxCount =
    monthly.reduce((max, m) => (m.count > max ? m.count : max), 0) || 1;

  const ms = monthStats ?? { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 };
  const totalMonth = ms.OPEN + ms.IN_PROGRESS + ms.RESOLVED || 1;
  const resolvedDeg = (ms.RESOLVED / totalMonth) * 360;
  const inProgDeg = (ms.IN_PROGRESS / totalMonth) * 360;

  const pieBackground = `conic-gradient(
    #22c55e 0deg ${resolvedDeg}deg,
    #3b82f6 ${resolvedDeg}deg ${resolvedDeg + inProgDeg}deg,
    #facc15 ${resolvedDeg + inProgDeg}deg 360deg
  )`;

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

        {/* Main */}
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
            <h2 style={{ margin: 0 }}>แสดงผลสถิติ</h2>
            {/* year selector: current year ± 2 years */}
            <div>
              <label style={{ marginRight: 8, fontSize: '0.9rem' }}>
                ปี:
              </label>
              <select
                value={year}
                onChange={e => setYear(parseInt(e.target.value, 10))}
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                }}
              >
                {[-1, 0, 1].map(offset => {
                  const y = now.getFullYear() + offset;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {error && <p style={{ color: 'red', marginTop: 8 }}>{error}</p>}

          <div style={graphGrid}>
            {/* Bar chart */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>
                จำนวนคำร้องแยกตามเดือน (ปี {year})
              </h3>
              {loading ? (
                <p>กำลังโหลด...</p>
              ) : (
                <div
                  style={{
                    marginTop: 12,
                    height: 220,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: 8,
                    }}
                  >
                    {monthly.map(m => {
                      const h = (m.count / maxCount) * 160;
                      return (
                        <div
                          key={m.month}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                          }}
                        >
                          <div
                            style={{
                              height: 160,
                              width: '100%',
                              display: 'flex',
                              alignItems: 'flex-end',
                              justifyContent: 'center',
                            }}
                          >
                            <div
                              style={{
                                width: '60%',
                                height: `${h}px`,
                                borderRadius: 6,
                                background: '#22c55e',
                              }}
                            />
                          </div>
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: '0.7rem',
                              color: '#4b5563',
                            }}
                          >
                            {m.month}
                          </div>
                          <div style={{ fontSize: '0.7rem' }}>{m.count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pie chart */}
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0, marginBottom: 4 }}>
                สถานะคำร้องในเดือน {monthName}
              </h3>
              {loading ? (
                <p>กำลังโหลด...</p>
              ) : (
                <>
                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: 180,
                        height: 180,
                        borderRadius: '50%',
                        background: pieBackground,
                      }}
                    />
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      fontSize: '0.9rem',
                    }}
                  >
                    <LegendItem color="#22c55e" label="RESOLVED" value={ms.RESOLVED} total={totalMonth} />
                    <LegendItem color="#3b82f6" label="IN_PROGRESS" value={ms.IN_PROGRESS} total={totalMonth} />
                    <LegendItem color="#facc15" label="OPEN" value={ms.OPEN} total={totalMonth} />
                  </div>
                </>
              )}
            </div>
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

function LegendItem(props: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  const percent = props.total ? ((props.value / props.total) * 100).toFixed(1) : '0.0';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: props.color,
        }}
      />
      <span style={{ flex: 1 }}>{props.label}</span>
      <span>
        {props.value} ({percent}%)
      </span>
    </div>
  );
}

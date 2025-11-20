// src/pages/AgentTicketsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import AppHeaderBackend from "../components/AppHeaderBackend";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "COMMIT";

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  createdBy?: { email?: string | null } | null;
  assignedTo?: { email?: string | null  , id : number} ;
  lastStatusChangedBy?: { email?: string | null } | null;
  commit_By?: number | null; // Added missing property
}

type Filter = "ALL" | TicketStatus;

export default function AgentTicketsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [searchId, setSearchId] = useState("");

  console.log("tickets :", tickets);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/tickets?page=1&limit=100`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to load tickets (${res.status})`);

        const data = await res.json();
        setTickets(data.items ?? data);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "Failed to load tickets");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (authLoading || !user) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
          background: "#f3f4f6",
          color: "#111827",
        }}
      >
        Checking your access…
      </div>
    );
  }

  function handleInfo(id: number) {
    nav(`/agent/ticket/${id}`);
  }

  async function handleStatusChange(id: number, next: TicketStatus) {
    try {
      setSavingId(id);
      const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        throw new Error(`เปลี่ยนสถานะไม่สำเร็จ (${res.status})`);
      }
      const updated = await res.json();

      setTickets((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, status: updated.status as TicketStatus } : t
        )
      );
    } catch (e: any) {
      alert(e.message ?? "เปลี่ยนสถานะไม่สำเร็จ");
      console.error(e);
    } finally {
      setSavingId(null);
    }
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, "");
    setSearchId(digitsOnly);
  }

  const normalizedSearch = searchId.trim();

  // 🐛 FIX: Fixed the filter logic - was missing return statements
  const filteredTickets = tickets.filter((t) => {
    // Status filter
    let statusMatch = false;
    if (filter === "ALL") {
      statusMatch = true;
    } else if (filter === "COMMIT") {
      statusMatch = t.assignedTo.id === user.id;
    } else {
      statusMatch = t.status === filter;
    }

    // Search filter (ticket id padded to 7 digits)
    let searchMatch = true;
    if (normalizedSearch) {
      const paddedId = String(t.id).padStart(7, "0");
      searchMatch = paddedId.includes(normalizedSearch);
    }

    return statusMatch && searchMatch;
  });

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "24px",
    boxSizing: "border-box",
    fontFamily: "system-ui",
  };

  const shellStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 18px 40px rgba(0,0,0,0.15)",
    padding: "20px",
  };

  const filterBarStyle: React.CSSProperties = {
    display: "flex",
    gap: "8px",
    marginBottom: "12px",
    alignItems: "center",
    flexWrap: "wrap",
  };

  const tableWrapperStyle: React.CSSProperties = {
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    padding: "12px",
    overflowX: "auto",
  };

  const searchInputStyle: React.CSSProperties = {
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid #d1d5db",
    fontSize: "0.85rem",
    minWidth: "180px",
    background: "#ffffff",
  };

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <AppHeaderBackend user={user} title={"AGENT"} />

        <div style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0, marginBottom: 12 }}>
            รายการคำร้องทั้งหมด
          </h2>

          {error && (
            <div
              style={{
                marginBottom: "1rem",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                background: "#fee2e2",
                color: "#7f1d1d",
                fontSize: "0.9rem",
              }}
            >
              {error}
            </div>
          )}

          <div style={filterBarStyle}>
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <FilterButton
                label="All"
                active={filter === "ALL"}
                onClick={() => setFilter("ALL")}
              />
              <FilterButton
                label="OPEN"
                active={filter === "OPEN"}
                onClick={() => setFilter("OPEN")}
              />
              <FilterButton
                label="IN_PROGRESS"
                active={filter === "IN_PROGRESS"}
                onClick={() => setFilter("IN_PROGRESS")}
              />
              <FilterButton
                label="RESOLVED"
                active={filter === "RESOLVED"}
                onClick={() => setFilter("RESOLVED")}
              />
              <FilterButton
                label="COMMIT"
                active={filter === "COMMIT"}
                onClick={() => setFilter("COMMIT")}
              />
            </div>

            <div style={{ marginLeft: "auto" }}>
              <input
                type="text"
                value={searchId}
                onChange={handleSearchChange}
                placeholder="ค้นหา Ticket โดยใช้ ID"
                inputMode="numeric"
                style={searchInputStyle}
              />
            </div>
          </div>

          <div style={tableWrapperStyle}>
            {loading ? (
              <p>กำลังดาวโหลด...</p>
            ) : filteredTickets.length === 0 ? (
              <p style={{ margin: 0 }}>ไม่พบคำร้องตามเงื่อนไข</p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr style={{ background: "#e5e7eb" }}>
                    <Th>สถานะคำร้อง</Th>
                    <Th>Ticket ID</Th>
                    <Th>หัวข้อ</Th>
                    <Th>รายละเอียดคำร้อง</Th>
                    <Th>เบอร์ติดต่อ</Th>
                    <Th>ผู้ร้องขอ</Th>
                    <Th>สร้าง ณ วันที่</Th>
                    <Th>เปลี่ยนสถานะ</Th>
                    <Th>ตัวเลือก</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => (
                    <tr key={t.id} style={{ borderTop: "1px solid #e5e7eb" }}>
                      <Td>
                        <span style={getStatusStyle(t.status)}>{t.status}</span>
                      </Td>
                      <Td>{String(t.id).padStart(7, "0")}</Td>
                      <Td>{t.title}</Td>
                      <Td>{t.detail}</Td>
                      <Td>{t.tel || "-"}</Td>
                      <Td>{t.createdBy?.email || "-"}</Td>
                      <Td>{new Date(t.createdAt).toLocaleString()}</Td>
                      <Td>
                        <select
                          value={t.status}
                          onChange={(e) =>
                            handleStatusChange(
                              t.id,
                              e.target.value as TicketStatus
                            )
                          }
                          disabled={savingId === t.id}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "999px",
                            border: "1px solid #d1d5db",
                            fontSize: "0.8rem",
                            background: "#ffffff",
                          }}
                        >
                          <option value="OPEN">OPEN</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="RESOLVED">RESOLVED</option>
                        </select>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => handleInfo(t.id)}
                          style={{
                            padding: "4px 10px",
                            borderRadius: "999px",
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                          }}
                        >
                          Info
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterButton(props: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const { label, active, onClick } = props;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: "999px",
        border: active ? "1px solid #16a34a" : "1px solid #d1d5db",
        background: active ? "#22c55e" : "#ffffff",
        color: active ? "#020617" : "#111827",
        fontSize: "0.85rem",
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "8px",
        borderBottom: "1px solid #d1d5db",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td
      style={{
        padding: "6px 8px",
        verticalAlign: "top",
      }}
    >
      {children}
    </td>
  );
}

function getStatusStyle(status: TicketStatus): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: "999px",
    fontWeight: 600,
    fontSize: "0.8rem",
    display: "inline-block",
  };
  switch (status) {
    case "OPEN":
      return { ...base, background: "#facc15", color: "#000000" };
    case "IN_PROGRESS":
      return { ...base, background: "#3b82f6", color: "#f8f8f8ff" };
    case "RESOLVED":
      return { ...base, background: "#22c55e", color: "#f8f8f8ff" };
    default:
      return base;
  }
}

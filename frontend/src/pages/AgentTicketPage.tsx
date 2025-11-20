// src/pages/AgentTicketsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { MdInfo } from "react-icons/md";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "COMMIT";

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  createdBy?: { email?: string | null; name?: string | null } | null;
  assignedTo?: {
    email?: string | null;
    name?: string | null;
    id: string;
  } | null;
  lastStatusChangedBy?: { email?: string | null } | null;
  commit_By?: number | null;
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
      <div className="min-h-screen grid place-items-center font-sans bg-gray-100 text-gray-900">
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

  const filteredTickets = tickets.filter((t) => {
    let statusMatch = false;
    if (filter === "ALL") {
      statusMatch = true;
    } else if (filter === "COMMIT") {
      statusMatch = t.assignedTo?.id === user.id;
    } else {
      statusMatch = t.status === filter;
    }

    let searchMatch = true;
    if (normalizedSearch) {
      const paddedId = String(t.id).padStart(7, "0");
      searchMatch = paddedId.includes(normalizedSearch);
    }

    return statusMatch && searchMatch;
  });

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
        className={`px-3.5 py-1.5 rounded-full border text-sm font-semibold cursor-pointer ${
          active
            ? "border-green-600 bg-green-500 text-gray-900"
            : "border-gray-300 bg-white text-gray-900"
        }`}
      >
        {label}
      </button>
    );
  }

  function Th({ children }: { children: React.ReactNode }) {
    return (
      <th className="text-left p-2 border-b border-gray-300 whitespace-nowrap">
        {children}
      </th>
    );
  }

  function Td({ children }: { children: React.ReactNode }) {
    return <td className="p-1.5 align-top">{children}</td>;
  }

  function getStatusClass(status: TicketStatus): string {
    const base = "px-2.5 py-1 rounded-full font-semibold text-xs inline-block";
    switch (status) {
      case "OPEN":
        return `${base} bg-yellow-400 text-gray-100`;
      case "IN_PROGRESS":
        return `${base} bg-blue-500 text-white`;
      case "RESOLVED":
        return `${base} bg-green-500 text-white`;
      default:
        return base;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl p-5">
        <AppHeaderBackend user={user} title={"AGENT"} />

        <div className="mt-4">
          <h2 className="mt-0 mb-3 text-2xl font-bold">รายการคำร้องทั้งหมด</h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-900 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-3 items-center flex-wrap">
            <div className="flex gap-2 flex-wrap">
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

            <div className="ml-auto">
              <input
                type="text"
                value={searchId}
                onChange={handleSearchChange}
                placeholder="ค้นหา Ticket โดยใช้ ID"
                inputMode="numeric"
                className="px-3 py-1.5 rounded-full border border-gray-300 text-sm min-w-[180px] bg-white"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 overflow-x-auto">
            {loading ? (
              <p>กำลังดาวโหลด...</p>
            ) : filteredTickets.length === 0 ? (
              <p className="m-0">ไม่พบคำร้องตามเงื่อนไข</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <Th>สถานะคำร้อง</Th>
                    <Th>Ticket ID</Th>
                    <Th>หัวข้อ</Th>
                    <Th>รายละเอียดคำร้อง</Th>
                    <Th>เบอร์ติดต่อ</Th>
                    <Th>ผู้ร้องขอ</Th>
                    <Th>ผู้รับ</Th>
                    <Th>สร้าง ณ วันที่</Th>
                    <Th>เปลี่ยนสถานะ</Th>
                    <Th>ตัวเลือก</Th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => (
                    <tr key={t.id} className="border-t border-gray-200">
                      <Td>
                        <span className={getStatusClass(t.status)}>
                          {t.status === "OPEN"
                            ? "เปิด"
                            : t.status === "IN_PROGRESS"
                            ? "กำลังดำเนินการ"
                            : "ได้รับการแก้ไขแล้ว"}
                        </span>
                      </Td>
                      <Td>{String(t.id).padStart(7, "0")}</Td>
                      <Td>{t.title}</Td>
                      <Td>{t.detail}</Td>
                      <Td>{t.tel || "-"}</Td>
                      <Td>{t.createdBy?.name || "-"}</Td>
                      <Td>{t.assignedTo?.name || "-"}</Td>
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
                          className="px-2 py-1 rounded-full border border-gray-300 text-xs bg-white"
                        >
                          <option value="OPEN">เปิด</option>
                          <option value="IN_PROGRESS">กำลังดำเนินการ</option>
                          <option value="RESOLVED">ได้รับการแก้ไขแล้ว</option>
                        </select>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => handleInfo(t.id)}
                          className="px-3 py-1.5 rounded-full border border-gray-300 bg-white cursor-pointer text-xs hover:bg-gray-50 inline-flex items-center text-center"
                        >
                          <MdInfo className="mr-1" /> รายละเอียด
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

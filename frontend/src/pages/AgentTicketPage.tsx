// src/pages/AgentTicketsPage.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { MdInfo, MdRefresh } from "react-icons/md";

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

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "เปิด",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "ได้รับการแก้ไขแล้ว",
  COMMIT: "ที่ส่ง",
};

export default function AgentTicketsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [searchId, setSearchId] = useState("");

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`${API_BASE}/tickets?page=1&limit=100`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`ไม่สามารถโหลดข้อมูลได้ (${res.status})`);
      }

      const data = await res.json();
      setTickets(data.items ?? data);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleInfo = useCallback(
    (id: number) => {
      nav(`/agent/ticket/${id}`);
    },
    [nav]
  );

  const handleStatusChange = useCallback(
    async (id: number, next: TicketStatus) => {
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
    },
    []
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const digitsOnly = raw.replace(/\D/g, "");
      setSearchId(digitsOnly);
    },
    []
  );

  const filteredTickets = useMemo(() => {
    const normalizedSearch = searchId.trim();

    return tickets.filter((t) => {
      let statusMatch = false;
      if (filter === "ALL") {
        statusMatch = true;
      } else if (filter === "COMMIT") {
        statusMatch = t.assignedTo?.id === user?.id;
      } else {
        statusMatch = t.status === "OPEN" || t.status === "IN_PROGRESS";
      }

      let searchMatch = true;
      if (normalizedSearch) {
        const paddedId = String(t.id).padStart(7, "0");
        searchMatch = paddedId.includes(normalizedSearch);
      }

      return statusMatch && searchMatch;
    });
  }, [tickets, filter, searchId, user?.id]);

  const ticketCounts = useMemo(() => {
    return {
      all: tickets.length,
      inProgress: tickets.filter(
        (t) => t.status === "OPEN" || t.status === "IN_PROGRESS"
      ).length,
      resolved: tickets.filter((t) => t.status === "RESOLVED").length,
      commit: tickets.filter((t) => t.assignedTo?.id === user?.id).length,
    };
  }, [tickets, user?.id]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center font-sans bg-gray-100 text-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  function FilterButton(props: {
    label: string;
    count?: number;
    active: boolean;
    onClick: () => void;
  }) {
    const { label, count, active, onClick } = props;
    return (
      <button
        type="button"
        onClick={onClick}
        className={`px-3.5 py-1.5 rounded-full border text-sm font-semibold cursor-pointer transition-all ${
          active
            ? "border-green-600 bg-green-500 text-white shadow-md"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        {label}
        {count !== undefined && (
          <span className={`ml-1.5 ${active ? "text-white" : "text-gray-500"}`}>
            ({count})
          </span>
        )}
      </button>
    );
  }

  function Th({ children }: { children: React.ReactNode }) {
    return (
      <th className="text-left p-2 border-b border-gray-300 whitespace-nowrap font-semibold text-gray-700">
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
        return `${base} bg-yellow-400 text-gray-900`;
      case "IN_PROGRESS":
        return `${base} bg-blue-500 text-white`;
      case "RESOLVED":
        return `${base} bg-green-500 text-white`;
      default:
        return base;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-6">
      <div className="container mx-auto bg-white rounded-2xl shadow-2xl p-5">
        <AppHeaderBackend user={user} title={"AGENT"} />

        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="mt-0 mb-0 text-2xl font-bold text-gray-800">
              รายการคำร้องทั้งหมด
            </h2>
            <button
              type="button"
              onClick={fetchTickets}
              disabled={loading}
              className="px-3 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium flex items-center gap-1 transition-all disabled:opacity-50"
            >
              <MdRefresh className={loading ? "animate-spin" : ""} />
              รีเฟรช
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-900 text-sm flex items-start gap-2">
              <span className="font-semibold">ข้อผิดพลาด:</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 mb-3 items-center flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <FilterButton
                label="เปิด/กำลังดำเนินการ"
                count={ticketCounts.inProgress}
                active={filter === "IN_PROGRESS"}
                onClick={() => setFilter("IN_PROGRESS")}
              />

              <FilterButton
                label="งานที่มอบหมาย"
                count={ticketCounts.commit}
                active={filter === "COMMIT"}
                onClick={() => setFilter("COMMIT")}
              />
              <FilterButton
                label="ทั้งหมด"
                count={ticketCounts.all}
                active={filter === "ALL"}
                onClick={() => setFilter("ALL")}
              />
            </div>

            <div className="ml-auto">
              <input
                type="text"
                value={searchId}
                onChange={handleSearchChange}
                placeholder="ค้นหา Ticket โดยใช้ ID"
                inputMode="numeric"
                className="px-3 py-1.5 rounded-full border border-gray-300 text-sm min-w-[180px] bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 overflow-x-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-3"></div>
                <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="m-0 text-lg">
                  {searchId ? "ไม่พบคำร้องที่ค้นหา" : "ไม่พบคำร้องตามเงื่อนไข"}
                </p>
              </div>
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
                    <tr
                      key={t.id}
                      className="border-t border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <Td>
                        <span className={getStatusClass(t.status)}>
                          {STATUS_LABELS[t.status]}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono font-semibold text-gray-700">
                          {String(t.id).padStart(7, "0")}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-medium text-gray-900">
                          {t.title}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-gray-600 line-clamp-2">
                          {t.detail}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-gray-700">
                          {t.tel || "-"}
                        </span>
                      </Td>
                      <Td>{t.createdBy?.name || "-"}</Td>
                      <Td>
                        <span
                          className={
                            t.assignedTo?.name
                              ? "text-green-700 font-medium"
                              : ""
                          }
                        >
                          {t.assignedTo?.name || "-"}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-gray-600 text-xs">
                          {formatDate(t.createdAt)}
                        </span>
                      </Td>
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
                          className="px-2 py-1 rounded-full border border-gray-300 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="OPEN">{STATUS_LABELS.OPEN}</option>
                          <option value="IN_PROGRESS">
                            {STATUS_LABELS.IN_PROGRESS}
                          </option>
                          <option value="RESOLVED">
                            {STATUS_LABELS.RESOLVED}
                          </option>
                        </select>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => handleInfo(t.id)}
                          className="px-3 py-1.5 rounded-full border border-gray-300 bg-white cursor-pointer text-xs hover:bg-gray-50 inline-flex items-center text-center transition-colors"
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

          {!loading && filteredTickets.length > 0 && (
            <div className="mt-3 text-sm text-gray-600 text-right">
              แสดง {filteredTickets.length} จาก {tickets.length} คำร้อง
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

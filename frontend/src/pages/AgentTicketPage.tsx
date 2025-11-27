// src/pages/AgentTicketPage.tsx
import React, { useCallback, useEffect, useState } from "react";
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

type Filter = "ACTIVE" | "OPEN" | "IN_PROGRESS" | "COMMIT" | "ALL";

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "เปิด",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "ปิดแล้ว",
  COMMIT: "มอบหมายให้ฉัน",
};

const FILTER_LABELS: Record<Filter, string> = {
  ACTIVE: "เปิด + กำลังดำเนินการ",
  OPEN: "เปิด",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMMIT: "ตั๋วที่รับผิดชอบ (ฉัน)",
  ALL: "ทั้งหมด",
};

interface FilterResponse {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
  counts: {
    active: number;
    open: number;
    inProgress: number;
    commit: number;
    all: number;
  };
}

export default function AgentTicketsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ACTIVE");
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [counts, setCounts] = useState({
    active: 0,
    open: 0,
    inProgress: 0,
    commit: 0,
    all: 0,
  });

  const fetchTickets = useCallback(
    async (nextFilter: Filter = filter, searchTerm: string = search) => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API_BASE}/tickets/filter`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filter: nextFilter,
            search: searchTerm.trim() || undefined,
            page: 1,
            limit: 100,
          }),
        });

        if (!res.ok) {
          throw new Error(`โหลดรายการไม่สำเร็จ (${res.status})`);
        }

        const data = (await res.json()) as FilterResponse;
        setTickets(data.items ?? []);
        if (data.counts) {
          setCounts({
            active: data.counts.active ?? 0,
            open: data.counts.open ?? 0,
            inProgress: data.counts.inProgress ?? 0,
            commit: data.counts.commit ?? 0,
            all: data.counts.all ?? 0,
          });
        }
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "โหลดรายการไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    },
    [filter, search]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets(filter, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [filter, search, fetchTickets]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTickets(filter, search);
    }, 300000);
    return () => clearInterval(intervalId);
  }, [filter, search, fetchTickets]);

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
          throw new Error(
            `อัปเดตสถานะไม่สำเร็จ (${res.status})`
          );
        }

        await fetchTickets(filter, search);
      } catch (e: any) {
        alert(e.message ?? "อัปเดตสถานะไม่สำเร็จ");
        console.error(e);
      } finally {
        setSavingId(null);
      }
    },
    [fetchTickets]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const term = e.target.value;
      setSearch(term);
    },
    []
  );

  if (authLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center font-sans bg-gray-100 text-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>กำลังโหลดข้อมูล...</p>
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
        className={`px-4 py-2 rounded-full border font-semibold cursor-pointer transition-all text-lg tracking-wide ${
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
      <th className="text-left p-3 text-2xl border-b border-gray-300 whitespace-nowrap font-semibold text-gray-800">
        {children}
      </th>
    );
  }

  function Td({ children }: { children: React.ReactNode }) {
    return <td className="p-2 text-xl align-top leading-relaxed">{children}</td>;
  }

  function getStatusClass(status: TicketStatus): string {
    const base = "px-3 py-1.5 rounded-full font-semibold text-sm inline-block";
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
    <div className="min-h-screen flex flex-col justify-stretch items-center bg-gradient-to-b from-gray-50 via-white to-gray-100 p-6 text-lg">
      <div className="w-full bg-white/85 backdrop-blur rounded-3xl shadow-[0_25px_80px_-40px_rgba(15,23,42,0.35)] border border-gray-100 p-6 mt-2">
        <AppHeaderBackend user={user} title={"AGENT"} />

        <div className="mt-4">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="mt-0 mb-0 text-3xl font-bold text-gray-900 tracking-tight">
              คิวงานของเจ้าหน้าที่
            </h2>
            <button
              type="button"
              onClick={() => fetchTickets(filter, search)}
              disabled={loading}
              className="px-4 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-base font-semibold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <MdRefresh className={loading ? "animate-spin" : ""} />
              รีเฟรชรายการ
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-100 text-red-900 text-base flex items-start gap-2">
              <span className="font-semibold">เกิดข้อผิดพลาด:</span>
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 mb-4 items-center flex-wrap">
            <div className="flex gap-2 flex-wrap">
              <FilterButton
                label={FILTER_LABELS.ACTIVE}
                count={counts.active}
                active={filter === "ACTIVE"}
              onClick={() => setFilter("ACTIVE")}
            />
            <FilterButton
              label={FILTER_LABELS.OPEN}
              count={counts.open}
              active={filter === "OPEN"}
              onClick={() => setFilter("OPEN")}
            />
            <FilterButton
              label={FILTER_LABELS.IN_PROGRESS}
              count={counts.inProgress}
              active={filter === "IN_PROGRESS"}
              onClick={() => setFilter("IN_PROGRESS")}
            />

              <FilterButton
              label={FILTER_LABELS.COMMIT}
              count={counts.commit}
              active={filter === "COMMIT"}
              onClick={() => setFilter("COMMIT")}
            />
            <FilterButton
              label={FILTER_LABELS.ALL}
              count={counts.all}
              active={filter === "ALL"}
              onClick={() => setFilter("ALL")}
            />
            </div>

            <div className="ml-auto flex gap-2">
              <input
                type="text"
                value={search}
                onChange={handleSearchChange}
                placeholder="ค้นหา ID, ผู้แจ้ง, ผู้รับผิดชอบ หรือเบอร์โทร"
                className="px-4 py-2 rounded-full border border-gray-300 text-base min-w-[260px] bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 overflow-x-auto">
            {loading ? (
              <div className="text-center py-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p className="m-0 text-xl">
                  {search
                    ? "ไม่พบรายการที่ตรงกับการค้นหา"
                    : "ยังไม่มีงานในคิวตอนนี้"}
                </p>
              </div>
            ) : (
              <table className="w-full border-collapse text-base">
                <thead>
                  <tr className="bg-gray-200">
                    <Th>สถานะ</Th>
                    <Th>Ticket ID</Th>
                    <Th>หัวข้อ</Th>
                    <Th>รายละเอียด</Th>
                    <Th>เบอร์ผู้แจ้ง</Th>
                    <Th>ผู้สร้าง</Th>
                    <Th>ผู้รับผิดชอบ</Th>
                    <Th>สร้างเมื่อ</Th>
                    <Th>อัปเดตสถานะ</Th>
                    <Th>ดูรายละเอียด</Th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
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
                        <span className="font-mono font-semibold text-gray-800 text-xl">
                          {String(t.id).padStart(7, "0")}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-semibold text-gray-900">
                          {t.title}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-gray-700 line-clamp-2">
                          {t.detail}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-gray-800">
                          {t.tel || "-"}
                        </span>
                      </Td>
                      <Td>{t.createdBy?.name || "-"}</Td>
                      <Td>
                        <span
                          className={
                            t.assignedTo?.name ? "text-green-700 font-semibold" : ""
                          }
                        >
                          {t.assignedTo?.name || "-"}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-gray-700 text-base">
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
                          className="px-3 py-2 rounded-full border border-gray-300 text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          className="px-4 py-2 rounded-full border border-gray-300 bg-white cursor-pointer text-base hover:bg-gray-50 inline-flex items-center text-center transition-colors"
                        >
                          <MdInfo className="mr-2" /> ดูรายละเอียด
                        </button>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {!loading && tickets.length > 0 && (
            <div className="mt-4 text-base text-gray-700 text-right">
              แสดง {tickets.length} รายการ
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

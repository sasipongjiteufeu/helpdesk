import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdHome, MdInfo, MdRefresh } from "react-icons/md";
import { FaUserShield } from "react-icons/fa";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { API_BASE, cachedJsonFetch, invalidateFrontendCache } from "../lib/api";
import {
  EmptyState,
  ErrorBanner,
  STATUS_LABELS,
  StatusBadge,
  TicketStatus,
  cx,
  formatDateTime,
} from "../components/helpdesk-ui";
import { MobileCardListSkeleton, PageSkeleton, TableSkeleton } from "../components/Skeleton";

type AppliedFilter =
  | "OPEN"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "COMMIT"
  | "FINISHED_BY_ME"
  | "IN_PROGRESS_BY_ME"
  | "ALL";

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  unreadMessageCount?: number | null;
  hasUnreadMessages?: boolean | null;
  lastMessageAt?: string | null;
  createdBy?: { email?: string | null; name?: string | null } | null;
  assignedTo?: { email?: string | null; name?: string | null; id: string } | null;
  participants?: Array<{
    isActive?: boolean;
    agent?: { id?: string; email?: string | null; name?: string | null } | null;
  }>;
}

interface FilterResponse {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
}

interface FetchTicketsOptions {
  filters: AppliedFilter[];
  searchTerm: string;
  page: number;
}

const PAGE_SIZE = 20;

const FILTERS: Array<{ key: AppliedFilter; label: string }> = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "OPEN", label: STATUS_LABELS.OPEN },
  { key: "IN_PROGRESS", label: STATUS_LABELS.IN_PROGRESS },
  { key: "RESOLVED", label: STATUS_LABELS.RESOLVED },
  { key: "IN_PROGRESS_BY_ME", label: "กำลังดำเนินการโดยฉัน" },
  { key: "FINISHED_BY_ME", label: "ปิดงานโดยฉัน" },
];

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) items.push("ellipsis-left");
  for (let value = start; value <= end; value += 1) items.push(value);
  if (end < totalPages - 1) items.push("ellipsis-right");
  items.push(totalPages);
  return items;
}

function getAgentWorkLabel(ticket: Ticket, userId?: string) {
  if (!userId) return null;
  if (ticket.assignedTo?.id === userId) {
    return { label: "เจ้าหน้าที่หลัก", className: "bg-emerald-50 text-emerald-800 border-emerald-200" };
  }

  const isParticipant = ticket.participants?.some(
    (participant) => participant.isActive && participant.agent?.id === userId,
  );
  if (isParticipant) {
    return { label: "ผู้ร่วมดูแล", className: "bg-blue-50 text-blue-800 border-blue-200" };
  }

  if (ticket.status === "IN_PROGRESS" && ticket.assignedTo?.id) {
    return { label: "ยังไม่ได้เข้าร่วม", className: "bg-slate-100 text-slate-700 border-slate-200" };
  }

  return null;
}

function AgentWorkBadge({ ticket, userId }: { ticket: Ticket; userId?: string }) {
  const badge = getAgentWorkLabel(ticket, userId);
  if (!badge) return null;
  return (
    <span
      className={cx(
        "inline-flex min-w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold leading-none",
        badge.className,
      )}
    >
      {badge.label}
    </span>
  );
}

function UnreadBadge({ ticket }: { ticket: Ticket }) {
  const count = ticket.unreadMessageCount ?? 0;
  const shouldShow = count > 0 || ticket.hasUnreadMessages;
  if (!shouldShow) return null;

  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 text-xs font-bold leading-none text-white shadow-sm motion-safe:animate-pulse">
      {count > 99 ? "99+" : count || "!"}
    </span>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "rounded-full border px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-100",
        active
          ? "border-blue-600 bg-blue-600 text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50",
      )}
    >
      {label}
    </button>
  );
}

export default function AgentTicketsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<AppliedFilter[]>([
    "OPEN",
    "IN_PROGRESS",
  ]);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);
  const paginationItems = useMemo(() => buildPaginationItems(page, totalPages), [page, totalPages]);

  const fetchTickets = useCallback(
    async function loadTickets({ filters, searchTerm, page: nextPage }: FetchTicketsOptions) {
      try {
        setLoading(true);
        setError(null);
        const trimmedSearch = searchTerm.trim();
        const { data } = await cachedJsonFetch<FilterResponse>(`${API_BASE}/tickets/filter`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filters,
            search: trimmedSearch || undefined,
            page: nextPage,
            limit: PAGE_SIZE,
          }),
        }, 10);

        const nextTotal = data.total ?? 0;
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
        if (nextPage > nextTotalPages) {
          setPage(nextTotalPages);
          return loadTickets({ filters, searchTerm, page: nextTotalPages });
        }
        setTickets(data.items ?? []);
        setTotal(nextTotal);
        setPage(data.page ?? nextPage);
      } catch (e: any) {
        setError(e.message ?? "โหลดรายการไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets({ filters: selectedFilters, searchTerm: search, page: 1 });
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchTickets, search, selectedFilters]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTickets({ filters: selectedFilters, searchTerm: search, page });
    }, 60000);
    return () => clearInterval(intervalId);
  }, [fetchTickets, page, search, selectedFilters]);

  function toggleFilter(key: AppliedFilter) {
    setPage(1);
    setSelectedFilters((current) => {
      if (key === "ALL") return ["ALL"];
      const withoutAll = current.filter((item) => item !== "ALL");
      const next = withoutAll.includes(key)
        ? withoutAll.filter((item) => item !== key)
        : [...withoutAll, key];
      return next.length ? next : ["ALL"];
    });
  }

  const handleStatusChange = useCallback(
    async (id: number, next: TicketStatus) => {
      try {
        setSavingId(id);
        setError(null);
        const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error(`Update failed (${res.status})`);

        invalidateFrontendCache("/tickets/");
        await fetchTickets({ filters: selectedFilters, searchTerm: search, page });
      } catch (e: any) {
        setError(e.message ?? "อัปเดตสถานะไม่สำเร็จ");
      } finally {
        setSavingId(null);
      }
    },
    [fetchTickets, page, search, selectedFilters],
  );

  function refresh() {
    fetchTickets({ filters: selectedFilters, searchTerm: search, page });
  }

  if (authLoading || !user) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-4 text-slate-900 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1800px] space-y-5">
        <AppHeaderBackend user={user} title="AGENT" />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="m-0 text-sm font-semibold text-blue-600">แดชบอร์ดเจ้าหน้าที่</p>
              <h2 className="m-0 mt-1 text-2xl font-bold text-slate-950">คิวงานเจ้าหน้าที่</h2>
              <p className="m-0 mt-1 text-sm text-slate-500">
                ทั้งหมด {total.toLocaleString("th-TH")} รายการ • หน้า {page} จาก {totalPages}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <MdHome /> หน้าสาธารณะ
              </button>
              {user.roles && user.roles.length > 1 && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/choose-role")}
                  className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <FaUserShield /> เลือกบทบาท
                </button>
              )}
              <button
                type="button"
                onClick={refresh}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <MdRefresh className={loading ? "animate-spin" : ""} /> รีเฟรช
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="flex min-w-0 flex-wrap gap-2">
              {FILTERS.map((filter) => (
                <FilterChip
                  key={filter.key}
                  label={filter.label}
                  active={selectedFilters.includes(filter.key)}
                  onClick={() => toggleFilter(filter.key)}
                />
              ))}
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหา ID, ผู้แจ้ง, ผู้รับผิดชอบ, เบอร์โทร หรือ #tag"
              className="h-11 w-full rounded-full border border-slate-300 bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </section>

        {error && <ErrorBanner message={error} onRetry={refresh} />}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <h3 className="m-0 text-lg font-bold text-slate-950">รายการแจ้งปัญหา</h3>
              <p className="m-0 mt-1 text-sm text-slate-500">
                แสดงผลแบบตารางบนหน้าจอใหญ่ และเปลี่ยนเป็นการ์ดบนมือถือ
              </p>
            </div>
            <div className="inline-flex min-w-fit items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-semibold text-slate-700">
              {total.toLocaleString("th-TH")} รายการ
            </div>
          </div>
          {loading ? (
            <div className="p-3">
              <div className="hidden md:block">
                <TableSkeleton rows={6} columns={9} className="border-0 shadow-none" showHeader={false} />
              </div>
              <MobileCardListSkeleton count={3} />
            </div>
          ) : tickets.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={search ? "ไม่พบรายการที่ค้นหา" : "ยังไม่มีงานในคิวตอนนี้"}
                description="ลองเปลี่ยนตัวกรองหรือรีเฟรชรายการอีกครั้ง"
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[1120px] border-collapse text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">สถานะ</th>
                      <th className="px-4 py-3">Ticket ID</th>
                      <th className="px-4 py-3">หัวข้อ</th>
                      <th className="px-4 py-3">รายละเอียด</th>
                      <th className="px-4 py-3">ผู้แจ้ง</th>
                      <th className="px-4 py-3">ผู้รับผิดชอบ</th>
                      <th className="px-4 py-3">สร้างเมื่อ</th>
                      <th className="px-4 py-3">สถานะงาน</th>
                      <th className="px-4 py-3">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className={cx(
                          "border-t border-slate-100 hover:bg-slate-50",
                          Boolean(ticket.unreadMessageCount || ticket.hasUnreadMessages) &&
                            "bg-blue-50/60 ring-1 ring-inset ring-blue-200 motion-safe:animate-pulse",
                        )}
                      >
                        <td className="px-4 py-4"><StatusBadge status={ticket.status} /></td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-slate-900">
                              {String(ticket.id).padStart(7, "0")}
                            </span>
                            <UnreadBadge ticket={ticket} />
                          </div>
                        </td>
                        <td className="max-w-[18rem] px-4 py-4">
                          <div className="line-clamp-2 font-semibold text-slate-900">{ticket.title}</div>
                        </td>
                        <td className="max-w-[34rem] px-4 py-4 text-slate-600">
                          <div className="line-clamp-2">{ticket.detail}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-700">{ticket.createdBy?.name || "-"}</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-slate-900">{ticket.assignedTo?.name || "-"}</div>
                          <div className="mt-1"><AgentWorkBadge ticket={ticket} userId={user.id} /></div>
                        </td>
                        <td className="px-4 py-4 text-slate-600">{formatDateTime(ticket.createdAt)}</td>
                        <td className="px-4 py-4">
                          <select
                            value={ticket.status}
                            onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                            disabled={savingId === ticket.id}
                            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="OPEN">{STATUS_LABELS.OPEN}</option>
                            <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</option>
                            <option value="RESOLVED">{STATUS_LABELS.RESOLVED}</option>
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => nav(`/agent/ticket/${ticket.id}`)}
                            className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            <MdInfo /> รายละเอียด <UnreadBadge ticket={ticket} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-3 p-3 lg:hidden">
                {tickets.map((ticket) => (
                  <article
                    key={ticket.id}
                    className={cx(
                      "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
                      Boolean(ticket.unreadMessageCount || ticket.hasUnreadMessages) &&
                        "border-blue-200 bg-blue-50/60 ring-1 ring-blue-200 motion-safe:animate-pulse",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-semibold text-slate-500">
                          #{String(ticket.id).padStart(7, "0")}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <UnreadBadge ticket={ticket} />
                          {Boolean(ticket.unreadMessageCount || ticket.hasUnreadMessages) && (
                            <span className="text-xs font-semibold text-blue-700">มีข้อความใหม่</span>
                          )}
                        </div>
                        <h3 className="m-0 mt-1 line-clamp-2 text-base font-bold text-slate-950">{ticket.title}</h3>
                      </div>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <p className="line-clamp-3 text-sm text-slate-600">{ticket.detail}</p>
                    <div className="grid gap-2 text-sm text-slate-600">
                      <div>ผู้แจ้ง: <span className="font-semibold text-slate-800">{ticket.createdBy?.name || "-"}</span></div>
                      <div>ผู้รับผิดชอบ: <span className="font-semibold text-slate-800">{ticket.assignedTo?.name || "-"}</span></div>
                      <div><AgentWorkBadge ticket={ticket} userId={user.id} /></div>
                      <div>สร้างเมื่อ: {formatDateTime(ticket.createdAt)}</div>
                    </div>
                    <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                      <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value as TicketStatus)}
                        disabled={savingId === ticket.id}
                        className="h-11 flex-1 rounded-full border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
                      >
                        <option value="OPEN">{STATUS_LABELS.OPEN}</option>
                        <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</option>
                        <option value="RESOLVED">{STATUS_LABELS.RESOLVED}</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => nav(`/agent/ticket/${ticket.id}`)}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        <MdInfo /> รายละเอียด
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>

        {!loading && total > 0 && (
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-600">
              แสดง {(page - 1) * PAGE_SIZE + 1}-{(page - 1) * PAGE_SIZE + tickets.length} จาก {total}
            </div>
            {totalPages > 1 && (
              <div className="flex flex-wrap gap-2">
                {paginationItems.map((item, index) =>
                  typeof item === "number" ? (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setPage(item);
                        fetchTickets({ filters: selectedFilters, searchTerm: search, page: item });
                      }}
                      disabled={item === page}
                      className={cx(
                        "h-10 min-w-10 rounded-full border px-3 text-sm font-semibold",
                        item === page
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      {item}
                    </button>
                  ) : (
                    <span key={`${item}-${index}`} className="px-2 py-2 text-slate-400">...</span>
                  ),
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

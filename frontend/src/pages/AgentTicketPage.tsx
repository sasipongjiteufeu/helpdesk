// src/pages/AgentTicketPage.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdHome, MdInfo, MdRefresh } from "react-icons/md";
import { FaUserShield } from "react-icons/fa";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { API_BASE } from "../lib/api";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";
type AppliedFilter = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "COMMIT" | "FINISHED_BY_ME" | "IN_PROGRESS_BY_ME" | "ALL";

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

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "เสร็จสิ้น",
};

function buildPaginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis-left" | "ellipsis-right"> = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) {
    items.push("ellipsis-left");
  }

  for (let value = start; value <= end; value += 1) {
    items.push(value);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis-right");
  }

  items.push(totalPages);
  return items;
}

function FilterCheckBox(props: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  const { label, checked, onChange } = props;

  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="form-checkbox h-5 w-5 text-blue-600 rounded"
      />
      <span className="text-lg">{label}</span>
    </label>
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

export default function AgentTicketsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOpen, setShowOpen] = useState(true);
  const [showInProgress, setShowInProgress] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [showCommit, setShowCommit] = useState(false);
  const [showFinishedByMe, setShowFinishedByMe] = useState(false);
  const [showInProgressByMe, setShowInProgressByMe] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const buildSelectedFilters = useCallback(
    (
      overrides: Partial<{
        open: boolean;
        inProgress: boolean;
        resolved: boolean;
        commit: boolean;
        finishedByMe: boolean;
        inProgressByMe: boolean;
        all: boolean;
      }> = {},
    ): AppliedFilter[] => {
      const nextAll = overrides.all ?? showAll;
      
      // If "ALL" is selected, return just ["ALL"]
      if (nextAll) {
        return ["ALL"];
      }
      
      const nextOpen = overrides.open ?? showOpen;
      const nextInProgress = overrides.inProgress ?? showInProgress;
      const nextResolved = overrides.resolved ?? showResolved;
      const nextCommit = overrides.commit ?? showCommit;
      const nextFinishedByMe = overrides.finishedByMe ?? showFinishedByMe;
      const nextInProgressByMe = overrides.inProgressByMe ?? showInProgressByMe;
      const nextFilters: AppliedFilter[] = [];

      if (nextOpen) nextFilters.push("OPEN");
      if (nextInProgress) nextFilters.push("IN_PROGRESS");
      if (nextResolved) nextFilters.push("RESOLVED");
      if (nextCommit) nextFilters.push("COMMIT");
      if (nextFinishedByMe) nextFilters.push("FINISHED_BY_ME");
      if (nextInProgressByMe) nextFilters.push("IN_PROGRESS_BY_ME");

      return nextFilters.length === 0 ? ["ALL"] : nextFilters;
    },
    [showCommit, showInProgress, showOpen, showResolved, showFinishedByMe, showInProgressByMe, showAll],
  );

  const selectedFilters = useMemo(
    () => buildSelectedFilters(),
    [buildSelectedFilters],
  );
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );
  const paginationItems = useMemo(
    () => buildPaginationItems(page, totalPages),
    [page, totalPages],
  );

  const fetchTickets = useCallback(
    async function loadTickets({
      filters,
      searchTerm,
      page: nextPage,
    }: FetchTicketsOptions) {
      try {
        setLoading(true);
        setError(null);

        const trimmedSearch = searchTerm.trim();
        const res = await fetch(`${API_BASE}/tickets/filter`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filters,
            search: trimmedSearch || undefined,
            page: nextPage,
            limit: PAGE_SIZE,
          }),
        });

        if (!res.ok) {
          throw new Error(`โหลดรายการไม่สำเร็จ (${res.status})`);
        }

        const data = (await res.json()) as FilterResponse;
        const nextTotal = data.total ?? 0;
        const nextTotalPages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));

        if (nextPage > nextTotalPages) {
          setPage(nextTotalPages);
          return loadTickets({
            filters,
            searchTerm,
            page: nextTotalPages,
          });
        }

        setTickets(data.items ?? []);
        setTotal(nextTotal);
        setPage(data.page ?? nextPage);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "โหลดรายการไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTickets({
        filters: selectedFilters,
        searchTerm: search,
        page: 1,
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [fetchTickets, search, selectedFilters]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchTickets({
        filters: selectedFilters,
        searchTerm: search,
        page,
      });
    }, 300000);

    return () => clearInterval(intervalId);
  }, [fetchTickets, page, search, selectedFilters]);

  const handleInfo = useCallback(
    (id: number) => {
      nav(`/agent/ticket/${id}`);
    },
    [nav],
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
          throw new Error(`อัปเดตสถานะไม่สำเร็จ (${res.status})`);
        }

        await fetchTickets({
          filters: selectedFilters,
          searchTerm: search,
          page,
        });
      } catch (e: any) {
        alert(e.message ?? "อัปเดตสถานะไม่สำเร็จ");
        console.error(e);
      } finally {
        setSavingId(null);
      }
    },
    [fetchTickets, page, search, selectedFilters],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(1);
    },
    [],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (loading || nextPage === page || nextPage < 1 || nextPage > totalPages) {
        return;
      }

      setPage(nextPage);
      fetchTickets({
        filters: selectedFilters,
        searchTerm: search,
        page: nextPage,
      });
    },
    [fetchTickets, loading, page, search, selectedFilters, totalPages],
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

  return (
    <div className="min-h-screen flex flex-col justify-stretch items-center bg-gradient-to-b from-gray-50 via-white to-gray-100 p-6 text-lg">
      <div className="w-full bg-white/85 backdrop-blur rounded-3xl shadow-[0_25px_80px_-40px_rgba(15,23,42,0.35)] border border-gray-100 p-6 mt-2">
        <AppHeaderBackend user={user} title="AGENT" />

        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => (window.location.href = "/")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 text-white hover:bg-gray-900 shadow transition active:scale-[0.98]"
          >
            <MdHome className="text-xl" />
            <span>หน้าสาธารณะ</span>
          </button>

          {user?.roles && user.roles.length > 1 && (
            <button
              onClick={() => (window.location.href = "/choose-role")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow transition active:scale-[0.98]"
            >
              <FaUserShield className="text-xl" />
              <span>เลือกบทบาท</span>
            </button>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
            <h2 className="mt-0 mb-0 text-3xl font-bold text-gray-900 tracking-tight">
              คิวงานของเจ้าหน้าที่
            </h2>
            <button
              type="button"
              onClick={() =>
                fetchTickets({
                  filters: selectedFilters,
                  searchTerm: search,
                  page,
                })
              }
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
              <FilterCheckBox
                label="ทั้งหมด"
                checked={showAll}
                onChange={() => {
                  setPage(1);
                  setShowAll((value) => !value);
                  if (!showAll) {
                    setShowOpen(false);
                    setShowInProgress(false);
                    setShowResolved(false);
                    setShowCommit(false);
                    setShowFinishedByMe(false);
                    setShowInProgressByMe(false);
                  }
                }}
              />
              <FilterCheckBox
                label="รอดำเนินการ"
                checked={showOpen && !showAll}
                onChange={() => {
                  setPage(1);
                  setShowAll(false);
                  setShowOpen((value) => !value);
                }}
              />
              <FilterCheckBox
                label="กำลังดำเนินการ"
                checked={showInProgress && !showAll}
                onChange={() => {
                  setPage(1);
                  setShowAll(false);
                  setShowInProgress((value) => !value);
                }}
              />
              <FilterCheckBox
                label="เสร็จสิ้น"
                checked={showResolved && !showAll}
                onChange={() => {
                  setPage(1);
                  setShowAll(false);
                  setShowResolved((value) => !value);
                }}
              />
              <FilterCheckBox
                label="กำลังดำเนินการโดยฉัน"
                checked={showInProgressByMe && !showAll}
                onChange={() => {
                  setPage(1);
                  setShowAll(false);
                  setShowInProgressByMe((value) => !value);
                }}
              />
              <FilterCheckBox
                label="เสร็จสิ้นโดยฉัน"
                checked={showFinishedByMe && !showAll}
                onChange={() => {
                  setPage(1);
                  setShowAll(false);
                  setShowFinishedByMe((value) => !value);
                }}
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

          <div className="mt-6 sm:mt-8 rounded-2xl border border-gray-200 bg-gray-50/70 overflow-hidden shadow-inner">
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
                <thead className="bg-gray-200/80 text-left text-gray-800 text-base md:text-lg">
                  <tr className="bg-gray-200">
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                      สถานะ
                    </th>
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                      Ticket ID
                    </th>
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                      หัวข้อ
                    </th>
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left w-[35%] md:w-[40%]">
                      รายละเอียด
                    </th>
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                      เบอร์ผู้แจ้ง
                    </th>
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                      ผู้สร้าง
                    </th>
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                      ผู้รับผิดชอบ
                    </th>
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                      สร้างเมื่อ
                    </th>
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                      อัปเดตสถานะ
                    </th>
                    <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                      ดูรายละเอียด
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      className="border-t border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                      <Td>
                        <span className={getStatusClass(ticket.status)}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono font-semibold text-gray-800 text-xl">
                          {String(ticket.id).padStart(7, "0")}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-semibold text-gray-900">
                          {ticket.title}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-gray-700 line-clamp-2">
                          {ticket.detail}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-mono text-gray-800">
                          {ticket.tel || "-"}
                        </span>
                      </Td>
                      <Td>{ticket.createdBy?.name || "-"}</Td>
                      <Td>
                        <span
                          className={
                            ticket.assignedTo?.name
                              ? "text-green-700 font-semibold"
                              : ""
                          }
                        >
                          {ticket.assignedTo?.name || "-"}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-gray-700 text-base">
                          {formatDate(ticket.createdAt)}
                        </span>
                      </Td>
                      <Td>
                        <select
                          value={ticket.status}
                          onChange={(e) =>
                            handleStatusChange(
                              ticket.id,
                              e.target.value as TicketStatus,
                            )
                          }
                          disabled={savingId === ticket.id}
                          className="px-3 py-2 rounded-full border border-gray-300 text-base bg-white focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="OPEN">{STATUS_LABELS.OPEN}</option>
                          <option value="IN_PROGRESS">{STATUS_LABELS.IN_PROGRESS}</option>
                          <option value="RESOLVED">{STATUS_LABELS.RESOLVED}</option>
                        </select>
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => handleInfo(ticket.id)}
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

          {!loading && total > 0 && (
            <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {totalPages > 1 && (
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={loading || page === 1}
                    className="px-3 py-2 rounded-full border border-gray-300 bg-white text-base font-semibold transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>

                  {paginationItems.map((item, index) =>
                    typeof item === "number" ? (
                      <button
                        key={item}
                        type="button"
                        onClick={() => handlePageChange(item)}
                        disabled={loading || item === page}
                        className={`min-w-11 px-3 py-2 rounded-full border text-base font-semibold transition-all ${
                          item === page
                            ? "border-green-600 bg-green-500 text-white cursor-default"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {item}
                      </button>
                    ) : (
                      <span
                        key={`${item}-${index}`}
                        className="px-2 text-gray-500 text-lg"
                      >
                        ...
                      </span>
                    ),
                  )}

                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={loading || page === totalPages}
                    className="px-3 py-2 rounded-full border border-gray-300 bg-white text-base font-semibold transition-all hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}

              <div className="text-base text-gray-700">
                Showing {(page - 1) * PAGE_SIZE + 1}-
                {(page - 1) * PAGE_SIZE + tickets.length} of {total}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { FaUserShield } from "react-icons/fa";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { API_BASE, cachedJsonFetch } from "../lib/api";
import { MobileCardListSkeleton, PageSkeleton, TableSkeleton } from "../components/Skeleton";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  resolvedAt?: string | null;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "ปิดแล้ว",
};

const ITEMS_PER_PAGE = 20;

export default function Home() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user, loading: authLoading } = useRequireAuth();
  const [page, setPage] = useState(1);

  async function loadTickets() {
    try {
      setLoading(true);
      setError(null);

      const { data } = await cachedJsonFetch<{ items?: Ticket[] }>(`${API_BASE}/tickets/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, limit: 100 }),
      }, 20);
      const items: Ticket[] = data.items ?? [];
      setTickets(items);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
    const intervalId = setInterval(() => {
      loadTickets();
    }, 300000);
    return () => clearInterval(intervalId);
  }, []);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(tickets.length / ITEMS_PER_PAGE)),
    [tickets.length],
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return tickets.slice(start, start + ITEMS_PER_PAGE);
  }, [tickets, page]);

  const todayActiveCount = useMemo(() => {
    const today = new Date().toDateString();
    return tickets.filter(
      (t) =>
        t.status === "IN_PROGRESS" &&
        new Date(t.createdAt).toDateString() === today,
    ).length;
  }, [tickets]);

  const todaywaitingCount = useMemo(() => {
    const today = new Date().toDateString();
    return tickets.filter(
      (t) =>
        t.status === "OPEN" &&
        new Date(t.createdAt).toDateString() === today,
    ).length;
  }, [tickets]);

  function StatusBadge({ status }: { status: TicketStatus }) {
    const base =
      "inline-flex min-w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold leading-none shadow-sm";
    const dot = "inline-block h-2.5 w-2.5 shrink-0 rounded-full";

    switch (status) {
      case "OPEN":
        return (
          <span className={`${base} bg-amber-100 text-amber-900`}>
            <span className={`${dot} bg-amber-500`} /> {STATUS_LABELS.OPEN}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className={`${base} bg-blue-100 text-blue-900`}>
            <span className={`${dot} bg-blue-500`} /> {STATUS_LABELS.IN_PROGRESS}
          </span>
        );
      case "RESOLVED":
        return (
          <span className={`${base} bg-emerald-100 text-emerald-900`}>
            <span className={`${dot} bg-emerald-500`} /> {STATUS_LABELS.RESOLVED}
          </span>
        );
      default:
        return <span className={base}>{status}</span>;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (authLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen w-full bg-slate-100 px-4 py-4 text-slate-900 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1800px] space-y-5">
        <AppHeaderBackend user={user} title="" />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="m-0 text-sm font-semibold text-blue-600">Helpdesk Dashboard</p>
              <h2 className="m-0 mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                รายการแจ้งปัญหา
              </h2>
              <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
                ติดตามสถานะ Ticket ที่เปิดอยู่และงานที่กำลังดำเนินการในระบบ Helpdesk
              </p>
            </div>

            {user?.roles && user.roles.length > 1 && (
              <div className="flex flex-wrap gap-2 lg:justify-end">
                <button
                  type="button"
                  onClick={() => (window.location.href = "/choose-role")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  <FaUserShield className="text-lg" />
                  <span>เลือกบทบาท</span>
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
            <p className="m-0 text-sm font-semibold text-slate-500">กำลังดำเนินการวันนี้</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <strong className="text-3xl font-bold text-blue-700">{todayActiveCount}</strong>
              <StatusBadge status="IN_PROGRESS" />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:p-5">
            <p className="m-0 text-sm font-semibold text-slate-500">รอดำเนินการวันนี้</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <strong className="text-3xl font-bold text-amber-700">{todaywaitingCount}</strong>
              <StatusBadge status="OPEN" />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 sm:p-5 xl:col-span-1">
            <p className="m-0 text-sm font-semibold text-slate-500">Ticket ที่แสดงทั้งหมด</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <strong className="text-3xl font-bold text-slate-900">{tickets.length}</strong>
              <span className="inline-flex min-w-fit shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-semibold leading-none text-slate-700">
                หน้า {page}/{totalPages}
              </span>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h3 className="m-0 text-lg font-bold text-slate-950">รายการ Ticket สาธารณะ</h3>
              <p className="m-0 mt-1 text-sm text-slate-500">อัปเดตข้อมูลอัตโนมัติทุก 5 นาที</p>
            </div>
            <span className="inline-flex min-w-fit shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-semibold leading-none text-slate-700">
              {tickets.length} รายการ
            </span>
          </div>

          {loading ? (
            <div className="p-3">
              <div className="hidden md:block">
                <TableSkeleton rows={6} columns={5} className="border-0 shadow-none" showHeader={false} />
              </div>
              <MobileCardListSkeleton count={3} />
            </div>
          ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">สถานะคำร้อง</th>
                  <th className="whitespace-nowrap px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">หัวข้อ</th>
                  <th className="w-[42%] px-4 py-3">รายละเอียดคำร้อง</th>
                  <th className="whitespace-nowrap px-4 py-3">สร้าง ณ วันที่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                      ยังไม่มีรายการ
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((t) => (
                    <tr key={t.id} className="transition-colors hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-4">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 font-mono font-semibold text-slate-700">
                        {String(t.id).padStart(7, "0")}
                      </td>
                      <td className="max-w-[18rem] px-4 py-4 font-semibold text-slate-950">
                        <div className="line-clamp-2 break-words">{t.title}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        <div className="line-clamp-2 break-words">{t.detail}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDate(t.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                ยังไม่มีรายการ
              </div>
            ) : (
              paginatedTickets.map((t) => (
                <article key={t.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold text-slate-500">
                        #{String(t.id).padStart(7, "0")}
                      </div>
                      <h3 className="m-0 mt-1 line-clamp-2 text-base font-bold text-slate-950">
                        {t.title}
                      </h3>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>
                  <p className="m-0 mt-3 line-clamp-3 break-words text-sm leading-6 text-slate-600">
                    {t.detail}
                  </p>
                  <div className="mt-3 text-sm text-slate-500">
                    สร้างเมื่อ: <span className="font-medium text-slate-700">{formatDate(t.createdAt)}</span>
                  </div>
                </article>
              ))
            )}
          </div>
          </>
          )}
        </section>

        {tickets.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                disabled={p === page}
                className={`h-10 min-w-10 rounded-full border px-3 text-sm font-semibold transition ${
                  p === page
                    ? "cursor-default border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// src/pages/Home.tsx
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../lib/api";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { FaUserShield } from "react-icons/fa";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
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

  // 👇 use global auth hook (NO redirect on "/")
  const { user, loading: authLoading } = useRequireAuth();

  // 👇 pagination
  const [page, setPage] = useState(1);

  async function loadTickets() {
    try {
      setLoading(true);
      setError(null);

      // public endpoint (POST)
      const res = await fetch(`${API_BASE}/tickets/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: 1, limit: 100 }), // get enough items then paginate client-side
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const items: Ticket[] = data.items ?? [];

      // show only OPEN + IN_PROGRESS for public

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
    }, 300000); // 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  // total pages from active tickets
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
      "px-3 py-1.5 rounded-full font-semibold text-sm inline-flex items-center gap-2 shadow-sm";
    const dot = "inline-block w-2.5 h-2.5 rounded-full";
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

  // show same “กำลังตรวจสอบ...” while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 flex items-center justify-center text-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">กำลังตรวจสอบ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 py-10 px-6 text-gray-900">
      <div className="max-w-7xl mx-auto bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_15px_60px_-20px_rgba(15,23,42,0.4)] border border-gray-200 px-4 sm:px-8 lg:px-10 py-6 sm:py-8">
        {/* 👇 now header knows user state → no “เข้าสู่ระบบ” when logged in */}
        <AppHeaderBackend user={user} title="" />

        {/* page-switch buttons under header */}
        <div className="flex flex-wrap gap-3 mt-4">
          {/* This page itself is public, so optional; keep only ChooseRole if you like */}
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

        <div className="mt-6 sm:mt-8 flex flex-col gap-2">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            รายการแจ้งปัญหา
          </h2>
          <p className="text-base sm:text-lg text-gray-600">
            จำนวนงานที่กำลังดำเนินการของวันนี้{" "}
            <span className="font-semibold text-emerald-700">
              {todayActiveCount} งาน
            </span>
          </p>

          <p className="text-base sm:text-lg text-gray-600">
            จำนวนงานที่รอดำเนินการของวันนี้{" "}
            <span className="font-semibold text-emerald-700">
              {todaywaitingCount} งาน
            </span>
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 sm:mt-8 rounded-2xl border border-gray-200 bg-gray-50/70 overflow-hidden shadow-inner">
          <table className="w-full border-collapse text-xs sm:text-sm md:text-base">
            <thead className="bg-gray-200/80 text-left text-gray-800 text-base md:text-lg">
              <tr>
                <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                  สถานะคำร้อง
                </th>
                <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                  Ticket ID
                </th>
                <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left">
                  หัวข้อ
                </th>
                <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left w-[35%] md:w-[40%]">
                  รายละเอียดคำร้อง
                </th>
                <th className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 font-semibold text-left whitespace-nowrap">
                  สร้าง ณ วันที่
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white text-base md:text-lg">
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    ยังไม่มีรายการ
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-800">
                      {String(t.id).padStart(7, "0")}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {t.title}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{t.detail}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {formatDate(t.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* pagination buttons */}
        {tickets.length > 0 && (
          <div className="mt-4 flex justify-center flex-wrap gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                disabled={p === page}
                className={`min-w-9 px-3 py-1.5 rounded-lg border text-sm md:text-base ${p === page
                    ? "bg-blue-600 text-white border-blue-600 cursor-default"
                    : "bg-white text-gray-700 hover:bg-gray-100 border-gray-300"
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

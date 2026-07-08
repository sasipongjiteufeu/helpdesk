import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { invalidateFrontendCache } from "../lib/api";
import {
  AgentRow,
  fetchAdminDashboardData,
  formatDuration,
  RangeStats,
  RatingDistributionStats,
  StatusStats,
  YearStats,
} from "../lib/adminStatsApi";
import StatCard from "../components/admin/StatCard";
import MonthlyTicketChart from "../components/admin/MonthlyTicketChart";
import TicketStatusChart from "../components/admin/TicketStatusChart";
import RatingDistributionChart from "../components/admin/RatingDistributionChart";
import SlaChart from "../components/admin/SlaChart";
import AgentPerformanceTable from "../components/admin/AgentPerformanceTable";
import { PageSkeleton, StatsDashboardSkeleton } from "../components/Skeleton";
import { MdArrowBack, MdRefresh, MdSearch } from "react-icons/md";

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getYearStartYmd(d: Date) {
  return toYmd(new Date(d.getFullYear(), 0, 1));
}

export default function AdminStatsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const today = new Date();
  const todayYmd = toYmd(today);
  const yearStartYmd = getYearStartYmd(today);

  const [fromDate, setFromDate] = useState(yearStartYmd);
  const [toDate, setToDate] = useState(todayYmd);
  const [chartYear, setChartYear] = useState(today.getFullYear());

  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [rangeStats, setRangeStats] = useState<RangeStats | null>(null);
  const [statusStats, setStatusStats] = useState<StatusStats | null>(null);
  const [ratingStats, setRatingStats] = useState<RatingDistributionStats | null>(null);
  const [agentStats, setAgentStats] = useState<AgentRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll(from: string, to: string, year: number) {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAdminDashboardData({ from, to, year });
      setYearStats(data.yearStats);
      setRangeStats(data.rangeStats);
      setStatusStats(data.statusStats);
      setRatingStats(data.ratingStats);
      setAgentStats(data.agentStats);
    } catch (e: any) {
      console.error("Error loading admin stats:", e);
      setError(e.message ?? "ไม่สามารถโหลดข้อมูลรายงานได้ กรุณาลองใหม่อีกครั้ง");
      setYearStats(null);
      setRangeStats(null);
      setStatusStats(null);
      setRatingStats(null);
      setAgentStats([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadAll(fromDate, toDate, chartYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const slaOverTarget = useMemo(() => {
    if (!rangeStats) return 0;
    return Math.max(0, rangeStats.resolvedTickets - rangeStats.resolvedWithinTargetCount);
  }, [rangeStats]);

  function handleSearch() {
    invalidateFrontendCache("/admin/stats");
    loadAll(fromDate, toDate, chartYear);
  }

  function handleReset() {
    setFromDate(yearStartYmd);
    setToDate(todayYmd);
    setChartYear(today.getFullYear());
    invalidateFrontendCache("/admin/stats");
    loadAll(yearStartYmd, todayYmd, today.getFullYear());
  }

  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value;
    if (value > todayYmd) value = todayYmd;
    setFromDate(value);
    if (toDate < value) setToDate(value);
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value;
    if (value > todayYmd) value = todayYmd;
    if (value < fromDate) value = fromDate;
    setToDate(value);
  }

  if (authLoading || !user) {
    return (
      <PageSkeleton>
        <StatsDashboardSkeleton />
      </PageSkeleton>
    );
  }

  const printStyles = `
    @page { size: A4; margin: 12mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
      .print-avoid-break { break-inside: avoid; page-break-inside: avoid; }
    }
  `;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6">
      <style>{printStyles}</style>
      <div className="mx-auto max-w-[1600px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <AppHeaderBackend user={user} title="ADMIN" />

        <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="m-0 text-2xl font-bold text-slate-950">Dashboard รายงาน Helpdesk</h2>
            <p className="m-0 mt-1 text-sm text-slate-500">
              ช่วงวันที่ {fromDate} ถึง {toDate} (คะแนนความพึงพอใจนับจากวันที่ผู้ใช้ให้คะแนน)
            </p>
          </div>

          <div className="no-print flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-600">จากวันที่</span>
              <input
                type="date"
                value={fromDate}
                max={todayYmd}
                onChange={handleFromChange}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-600">ถึงวันที่</span>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={todayYmd}
                onChange={handleToChange}
                className="h-10 rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium text-slate-600">ปีกราฟรายเดือน</span>
              <input
                type="number"
                min={2000}
                max={2100}
                value={chartYear}
                onChange={(e) => setChartYear(Number(e.target.value))}
                className="h-10 w-28 rounded-lg border border-slate-300 px-3 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              <MdSearch /> ค้นหา
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <MdRefresh /> รีเซ็ต
            </button>
            <button
              type="button"
              onClick={() => setTimeout(() => window.print(), 100)}
              className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              พิมพ์รายงาน
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-6">
            <StatsDashboardSkeleton />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {rangeStats && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard title="Ticket ทั้งหมด" value={rangeStats.totalTickets} accent="slate" />
                <StatCard title="กำลังดำเนินการ" value={rangeStats.inProgressTickets} accent="blue" />
                <StatCard title="ปิดแล้ว (ในช่วงวันที่)" value={rangeStats.resolvedTickets} accent="emerald" />
                <StatCard
                  title="คะแนนเฉลี่ยความพึงพอใจ"
                  value={
                    ratingStats?.averageRating != null
                      ? `${Number(ratingStats.averageRating).toFixed(2)} / 5`
                      : rangeStats.avgRating != null
                        ? `${rangeStats.avgRating.toFixed(2)} / 5`
                        : "-"
                  }
                  subtitle={`${ratingStats?.totalRated ?? rangeStats.ratedTickets ?? 0} Ticket ที่ได้รับคะแนน`}
                  accent="amber"
                />
                <StatCard
                  title="ปิดแล้วแต่ยังไม่ได้รับคะแนน"
                  value={rangeStats.unratedResolvedTickets}
                  accent="amber"
                />
                <StatCard
                  title="SLA สำเร็จภายใน 3 วัน"
                  value={`${(rangeStats.resolvedWithinTargetPercent ?? 0).toFixed(1)}%`}
                  subtitle={`${rangeStats.resolvedWithinTargetCount} จาก ${rangeStats.resolvedTickets}`}
                  accent="emerald"
                />
                <StatCard
                  title="เวลาเฉลี่ยเริ่มดำเนินการ"
                  value={formatDuration(rangeStats.avgTimeToFirstActionSeconds)}
                  accent="blue"
                />
                <StatCard
                  title="เวลาเฉลี่ยปิด Ticket"
                  value={formatDuration(rangeStats.avgTimeToResolveSeconds)}
                  accent="rose"
                />
              </div>
            )}

            <div className="grid gap-6 xl:grid-cols-2">
              {yearStats && <MonthlyTicketChart monthly={yearStats.monthly} year={yearStats.year} />}
              {statusStats && <TicketStatusChart stats={statusStats} />}
              {ratingStats && <RatingDistributionChart stats={ratingStats} />}
              {rangeStats && (
                <SlaChart
                  withinTarget={rangeStats.resolvedWithinTargetCount}
                  overTarget={slaOverTarget}
                />
              )}
            </div>

            <AgentPerformanceTable agents={agentStats} />
          </div>
        )}

        <button
          type="button"
          onClick={() => nav("/admin")}
          className="no-print mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          <MdArrowBack /> กลับหน้าหลัก ADMIN
        </button>
      </div>
    </div>
  );
}

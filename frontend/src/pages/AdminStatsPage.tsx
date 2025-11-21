// src/pages/AdminStatsPage.tsx
import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useNavigate } from "react-router-dom";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { MdArrowBack, MdRefresh } from "react-icons/md";

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

interface SLAStatusStats {
  thresholdDays: number;
  averageTimeToFirstActionSeconds: number;
  averageTimeToResolveSeconds: number;
  totalResolved: number;
  resolvedWithinThreshold: number;
  percentResolvedWithinThreshold: number;
}

export default function AdminStatsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStatusStats | null>(null);
  const [slaStats, setSlaStats] = useState<SLAStatusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function: แปลงวินาทีเป็นรูปแบบที่อ่านง่าย
  const formatDuration = (seconds: number): string => {
    if (!seconds || seconds === 0) return "0 วินาที";
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} วัน`);
    if (hours > 0) parts.push(`${hours} ชม.`);
    if (minutes > 0) parts.push(`${minutes} นาที`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} วินาที`);

    return parts.join(" ");
  };

  async function loadAll(targetYear: number) {
    try {
      setLoading(true);
      setError(null);

      const [ysRes, msRes, slaRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats/year?year=${targetYear}`, {
          credentials: "include",
        }),
        fetch(
          `${API_BASE}/admin/stats/month?year=${targetYear}&month=${
            now.getMonth() + 1
          }`,
          { credentials: "include" }
        ),
        fetch(`${API_BASE}/admin/sla`, { credentials: "include" }),
      ]);

      if (!ysRes.ok) throw new Error(`โหลดข้อมูลปีไม่สำเร็จ (${ysRes.status})`);
      if (!msRes.ok)
        throw new Error(`โหลดข้อมูลเดือนไม่สำเร็จ (${msRes.status})`);
      if (!slaRes.ok)
        throw new Error(`โหลดข้อมูล SLA ไม่สำเร็จ (${slaRes.status})`);

      const ysJson = (await ysRes.json()) as YearStats;
      const msJson = (await msRes.json()) as MonthStatusStats;
      const slaJson = (await slaRes.json()) as SLAStatusStats;

      setYearStats(ysJson);
      setMonthStats(msJson);
      setSlaStats(slaJson);
    } catch (e: any) {
      console.error("Error loading stats:", e);
      setError(e.message ?? "โหลดข้อมูลสถิติไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadAll(year);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, user]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังตรวจสอบสิทธิ์การเข้าถึง...</p>
        </div>
      </div>
    );
  }

  const monthName = now.toLocaleString("th-TH", { month: "long", year: "numeric" });

  // Prepare graph data
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

  function StatCard({
    title,
    value,
    subtitle,
    icon,
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon?: string;
  }) {
    return (
      <div className="relative max-w-full p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
        {icon && (
          <div className="absolute top-4 right-4 text-3xl opacity-10">
            {icon}
          </div>
        )}
        <h5 className="mb-3 text-lg font-semibold text-gray-700 leading-tight">
          {title}
        </h5>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>
    );
  }

  function LegendItem(props: {
    color: string;
    label: string;
    value: number;
    total: number;
  }) {
    const percent = props.total
      ? ((props.value / props.total) * 100).toFixed(1)
      : "0.0";
    return (
      <div className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition-colors">
        <span
          className="w-4 h-4 rounded-full flex-shrink-0"
          style={{ background: props.color }}
        />
        <span className="flex-1 font-medium text-gray-700">{props.label}</span>
        <span className="font-semibold text-gray-900">
          {props.value} <span className="text-gray-500 text-sm">({percent}%)</span>
        </span>
      </div>
    );
  }

  const monthNames = [
    "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-6 box-border font-sans">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl p-5">
        <AppHeaderBackend user={user} title={"ADMIN"} />

        {/* Main Content */}
        <div className="mt-6">
          {/* Header Section */}
          <div className="flex justify-between gap-3 items-center flex-wrap mb-6">
            <div>
              <h2 className="m-0 text-2xl font-bold text-gray-800">
                📊 แสดงผลสถิติ
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                รายงานสถิติและข้อมูลการดำเนินงาน
              </p>
            </div>
            <div className="flex gap-3 items-center">
              <div>
                <label className="mr-2 text-sm font-medium text-gray-700">
                  ปี:
                </label>
                <select
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {[-1, 0, 1].map((offset) => {
                    const y = now.getFullYear() + offset;
                    return (
                      <option key={y} value={y}>
                        {y + 543}
                      </option>
                    );
                  })}
                </select>
              </div>
              <button
                onClick={() => loadAll(year)}
                disabled={loading}
                className="p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <MdRefresh className={`text-xl ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="mb-6 text-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
            </div>
          )}

          {/* SLA Stats Cards */}
          {!loading && slaStats && (
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="เวลาเฉลี่ยถึงการดำเนินการครั้งแรก"
                value={formatDuration(slaStats.averageTimeToFirstActionSeconds)}
                icon="⏱️"
              />
              <StatCard
                title="เวลาเฉลี่ยในการแก้ไข"
                value={formatDuration(slaStats.averageTimeToResolveSeconds)}
                icon="⏲️"
              />
              <StatCard
                title="แก้ไขภายในเกณฑ์"
                value={`${slaStats.percentResolvedWithinThreshold.toFixed(1)}%`}
                subtitle={`${slaStats.resolvedWithinThreshold} จาก ${slaStats.totalResolved} คำร้อง`}
                icon="✅"
              />
              <StatCard
                title="จำนวนที่แก้ไขแล้วทั้งหมด"
                value={slaStats.totalResolved}
                icon="📋"
              />
              <StatCard
                title="จำนวนที่แก้ไขภายในเกณฑ์"
                value={slaStats.resolvedWithinThreshold}
                icon="🎯"
              />
              <StatCard
                title="เกณฑ์มาตรฐาน"
                value={`${slaStats.thresholdDays} วัน`}
                icon="📅"
              />
            </div>
          )}

          {/* Charts Section */}
          {!loading && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm">
                <h3 className="mt-0 mb-4 text-xl font-bold text-gray-800">
                  📈 จำนวนคำร้องแยกตามเดือน (ปี {year + 543})
                </h3>
                <div className="mt-4 h-[240px] flex flex-col">
                  <div className="flex-1 flex items-end gap-1">
                    {monthly.map((m) => {
                      const h = (m.count / maxCount) * 180;
                      return (
                        <div
                          key={m.month}
                          className="flex-1 flex flex-col items-center group"
                        >
                          <div className="h-[180px] w-full flex items-end justify-center relative">
                            <div
                              className="w-[70%] rounded-t-lg bg-gradient-to-t from-green-600 to-green-400 transition-all duration-300 hover:from-green-700 hover:to-green-500 cursor-pointer shadow-sm"
                              style={{ height: `${h}px` }}
                              title={`${monthNames[m.month - 1]}: ${m.count} คำร้อง`}
                            >
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                                {m.count} คำร้อง
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs font-medium text-gray-600">
                            {monthNames[m.month - 1]}
                          </div>
                          <div className="text-xs font-bold text-gray-800">
                            {m.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Pie Chart */}
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm">
                <h3 className="mt-0 mb-4 text-xl font-bold text-gray-800">
                  🥧 สถานะคำร้องในเดือน{monthName}
                </h3>
                <div className="mt-4 flex justify-center">
                  <div
                    className="w-[200px] h-[200px] rounded-full shadow-lg"
                    style={{ background: pieBackground }}
                  />
                </div>

                <div className="mt-6 flex flex-col gap-2">
                  <LegendItem
                    color="#22c55e"
                    label="แก้ไขแล้ว (RESOLVED)"
                    value={ms.RESOLVED}
                    total={totalMonth}
                  />
                  <LegendItem
                    color="#3b82f6"
                    label="กำลังดำเนินการ (IN_PROGRESS)"
                    value={ms.IN_PROGRESS}
                    total={totalMonth}
                  />
                  <LegendItem
                    color="#facc15"
                    label="รอดำเนินการ (OPEN)"
                    value={ms.OPEN}
                    total={totalMonth}
                  />
                  <div className="mt-2 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600">
                      รวมทั้งหมด: <span className="font-bold text-gray-900">{totalMonth}</span> คำร้อง
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Back Button */}
          <button
            type="button"
            onClick={() => nav("/admin")}
            className="mt-6 py-2 px-5 rounded-lg border border-gray-300 bg-white cursor-pointer hover:bg-gray-50 transition-all inline-flex items-center text-center font-medium shadow-sm hover:shadow"
          >
            <MdArrowBack className="mr-2" /> กลับหน้าหลัก ADMIN
          </button>
        </div>
      </div>
    </div>
  );
}
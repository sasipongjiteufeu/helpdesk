// src/pages/AdminStatsPage.tsx
import { useEffect, useState } from "react";
import { API_BASE, cachedJsonFetch } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useNavigate } from "react-router-dom";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { MdArrowBack, MdRefresh } from "react-icons/md";
import { PageSkeleton, StatsDashboardSkeleton } from "../components/Skeleton";


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

interface RangeStats {
  range: {
    from: string; // ISO
    to: string; // ISO
  };
  totalTickets: number;
  resolvedTickets: number;
  avgTimeToFirstActionSeconds: number | null;
  avgTimeToResolveSeconds: number | null;
  resolvedWithinTargetCount: number;
  resolvedWithinTargetPercent: number | null; // 0-100, อาจเป็น null
}

interface AgentRow {
  agentId: string;
  email: string;
  name?: string | null;
  inProgress: number;
  resolved: number;
}

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function AdminStatsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const today = new Date();
  const todayYmd = toYmd(today);

  // default: ย้อนหลัง 30 วัน
  const defaultFrom = new Date();
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const [fromDate, setFromDate] = useState(toYmd(defaultFrom));
  const [toDate, setToDate] = useState(todayYmd);

  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStatusStats | null>(null);
  const [rangeStats, setRangeStats] = useState<RangeStats | null>(null);
  const [agentStats, setAgentStats] = useState<AgentRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function savePageForPrint() {
    setTimeout(() => {
      window.print();
    }, 100);
  }
  
  // ---- helper: format duration safely ----
  const formatDuration = (seconds?: number | null): string => {
    if (seconds == null) return "—";
    const s = Math.abs(seconds);
    if (seconds === 0) return "0 วินาที";

    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = Math.floor(s % 60);

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} วัน`);
    if (hours > 0) parts.push(`${hours} ชม.`);
    if (minutes > 0) parts.push(`${minutes} นาที`);
    if (secs > 0) parts.push(`${secs} วินาที`);

    return parts.length ? parts.join(" ") : "0 วินาที";
  };

  async function loadAll(f: string, t: string) {
    try {
      setLoading(true);
      setError(null);

      const from = new Date(f + "T00:00:00");
      const to = new Date(t + "T23:59:59");

      // ปีสำหรับกราฟแท่ง (ใช้ปีของวันเริ่ม)
      const yearForMonthly = from.getFullYear();
      // เดือน+ปีสำหรับกราฟวงกลม (ใช้เดือนของวันสิ้นสุด)
      const monthForPie = to.getMonth() + 1;
      const yearForPie = to.getFullYear();

      const qsRange = `from=${encodeURIComponent(f)}&to=${encodeURIComponent(
        t
      )}`;

      const [ysResult, msResult, rangeResult, agentResult] = await Promise.all([
        cachedJsonFetch<YearStats>(`${API_BASE}/admin/stats/year?year=${yearForMonthly}`, {
          credentials: "include",
        }, 60),
        cachedJsonFetch<MonthStatusStats>(
          `${API_BASE}/admin/stats/month?year=${yearForPie}&month=${monthForPie}`,
          { credentials: "include" },
          60,
        ),
        cachedJsonFetch<RangeStats>(`${API_BASE}/admin/stats-range?${qsRange}`, {
          credentials: "include",
        }, 60),
        cachedJsonFetch<AgentRow[]>(`${API_BASE}/admin/stats/agents-range?${qsRange}`, {
          credentials: "include",
        }, 60),
      ]);

      const ysJson = ysResult.data;
      const msJson = msResult.data;
      const rangeJson = rangeResult.data;
      const agentJson = agentResult.data;

      setYearStats(ysJson);
      setMonthStats(msJson);
      setRangeStats(rangeJson);
      setAgentStats(agentJson ?? []);
    } catch (e: any) {
      console.error("Error loading admin stats:", e);
      setError(e.message ?? "โหลดข้อมูลสถิติไม่สำเร็จ");
      setRangeStats(null);
      setAgentStats([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadAll(fromDate, toDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, user]);

  if (authLoading || !user) {
    return <PageSkeleton><StatsDashboardSkeleton /></PageSkeleton>;
  }

  // ---- date handlers + constraints ----
  function handleFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value;

    // ห้ามมากกว่าวันนี้
    if (value > todayYmd) {
      value = todayYmd;
    }

    setFromDate(value);

    // ถ้า to อยู่ก่อน from ให้ดัน to ขึ้นมาเท่ากับ from
    if (toDate < value) {
      setToDate(value);
    }
  }

  function handleToChange(e: React.ChangeEvent<HTMLInputElement>) {
    let value = e.target.value;

    // ห้ามมากกว่าวันนี้ (กันเลือกอนาคต)
    if (value > todayYmd) {
      value = todayYmd;
    }

    // ห้ามน้อยกว่า from
    if (value < fromDate) {
      value = fromDate;
    }

    setToDate(value);
  }



  const fromObj = new Date(fromDate + "T00:00:00");
  const toObj = new Date(toDate + "T00:00:00");

  const monthForPieName = toObj.toLocaleString("th-TH", {
    month: "long",
    year: "numeric",
  });

  // ---- prepare monthly data (filter ตามช่วงวันที่) ----
  const monthlyAll = yearStats?.monthly ?? [];
  const startMonth =
    fromObj.getFullYear() === yearStats?.year ? fromObj.getMonth() + 1 : 1;
  const endMonth =
    toObj.getFullYear() === yearStats?.year ? toObj.getMonth() + 1 : 12;

  const monthlyFiltered = monthlyAll.filter(
    (m) => m.month >= startMonth && m.month <= endMonth
  );
  const monthly = monthlyFiltered.length > 0 ? monthlyFiltered : monthlyAll;

  const maxCount =
    monthly.reduce((max, m) => (m.count > max ? m.count : max), 0) || 1;

  // pie chart data
  const ms = monthStats ?? { OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 };
  const totalMonth = ms.OPEN + ms.IN_PROGRESS + ms.RESOLVED;

  // range summary / SLA
  const hasAnyData = (rangeStats?.totalTickets ?? 0) > 0;

  const resolvedPercentRaw =
    typeof rangeStats?.resolvedWithinTargetPercent === "number"
      ? rangeStats.resolvedWithinTargetPercent
      : 0;

  const resolvedPercent = isNaN(resolvedPercentRaw) ? 0 : resolvedPercentRaw;

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
      <div className="relative max-w-full p-6 bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow print-avoid-break">
        {icon && (
          <div className="absolute top-4 right-4 text-3xl opacity-10">
            {icon}
          </div>
        )}
        <h5 className="mb-3 text-lg font-semibold text-gray-700 leading-tight">
          {title}
        </h5>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
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
          {props.value}{" "}
          <span className="text-gray-500 text-sm">({percent}%)</span>
        </span>
      </div>
    );
  }

  const monthNames = [
    "ม.ค.",
    "ก.พ.",
    "มี.ค.",
    "เม.ย.",
    "พ.ค.",
    "มิ.ย.",
    "ก.ค.",
    "ส.ค.",
    "ก.ย.",
    "ต.ค.",
    "พ.ย.",
    "ธ.ค.",
  ];

  const rangeText = `ช่วงวันที่ ${fromDate} ถึงวันที่ ${toDate}`;

  const printStyles = `
    @page {
      size: A4;
      margin: 12mm;
    }
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        background: #f3f4f6;
      }
      .no-print { display: none !important; }
      .print-avoid-break {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  `;

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-6 box-border font-sans">
      <style>{printStyles}</style>
      <div className="container mx-auto bg-white rounded-2xl shadow-2xl p-5 print-avoid-break">
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
              <p className="text-xs text-gray-400 mt-0.5">{rangeText}</p>
            </div>
            <div className="flex gap-3 items-center flex-wrap">
              <button
                onClick={savePageForPrint}
                className="py-2 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow transition-all no-print"
              >
                Save / Print this page
              </button>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <label className="text-sm font-medium text-gray-700">
                  จากวันที่:
                </label>
                <input
                  type="date"
                  value={fromDate}
                  max={todayYmd}
                  onChange={handleFromChange}
                  className="py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                <label className="text-sm font-medium text-gray-700">
                  ถึงวันที่:
                </label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  max={todayYmd}
                  onChange={handleToChange}
                  className="py-2 px-3 rounded-lg border border-gray-300 text-sm font-medium hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button
                onClick={() => loadAll(fromDate, toDate)}
                disabled={loading}
                className="mt-2 sm:mt-0 p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="รีเฟรชข้อมูล"
              >
                <MdRefresh
                  className={`text-xl ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ⚠️ {error}
            </div>
          )}

          {loading && <StatsDashboardSkeleton />}

          {/* SLA / Range Stats Cards */}
          {!loading && !error && (
            <>
              {hasAnyData && rangeStats ? (
                <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 print-avoid-break">
                  <StatCard
                    title="เวลาเฉลี่ยในการดำเนินการครั้งแรก"
                    value={formatDuration(
                      rangeStats.avgTimeToFirstActionSeconds
                    )}
                    icon="⏱️"
                  />
                  <StatCard
                    title="เวลาเฉลี่ยตั้งแต่เริ่ม - ทำงานเสร็จ"
                    value={formatDuration(rangeStats.avgTimeToResolveSeconds)}
                    icon="⏲️"
                  />
                  <StatCard
                    title="แก้ไขภายในเกณฑ์"
                    value={`${resolvedPercent.toFixed(1)}%`}
                    subtitle={`${rangeStats.resolvedWithinTargetCount} จาก ${rangeStats.resolvedTickets} คำร้อง`}
                    icon="✅"
                  />
                  <StatCard
                    title="จำนวนที่แก้ไขแล้วทั้งหมด"
                    value={rangeStats.resolvedTickets}
                    icon="📋"
                  />
                  <StatCard
                    title="จำนวนที่แก้ไขภายในเกณฑ์"
                    value={rangeStats.resolvedWithinTargetCount}
                    icon="🎯"
                  />
                  <StatCard title="เกณฑ์มาตรฐาน" value={`3 วัน`} icon="📅" />
                </div>
              ) : (
                <div className="mb-6 p-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 text-center text-gray-500">
                  ยังไม่มีข้อมูลในช่วงวันที่ที่เลือก
                </div>
              )}
            </>
          )}

          {/* Charts Section */}
          {!loading && !error && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm min-h-[280px] print-avoid-break">
                <h3 className="mt-0 mb-2 text-xl font-bold text-gray-800">
                  📈 จำนวนคำร้องแยกตามเดือน
                </h3>
                <p className="text-xs text-gray-400 mb-4">{rangeText}</p>

                {hasAnyData && monthly.length > 0 ? (
                  <div className="mt-2 h-[220px] flex flex-col">
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
                                title={`${monthNames[m.month - 1]}: ${m.count
                                  } คำร้อง`}
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
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                    ยังไม่มีข้อมูลในช่วงนี้
                  </div>
                )}
              </div>

              {/* Pie Chart */}
              <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm min-h-[280px] print-avoid-break">
                <h3 className="mt-0 mb-1 text-xl font-bold text-gray-800">
                  🥧 สถานะคำร้องในเดือน{monthForPieName}
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  อิงตามวันสิ้นสุดช่วง ({toDate})
                </p>

                {hasAnyData && totalMonth > 0 ? (
                  <>
                    <div className="mt-2 flex justify-center">
                      <div
                        className="w-[200px] h-[200px] rounded-full shadow-lg"
                        style={{
                          background: `conic-gradient(
                            #22c55e 0deg ${(ms.RESOLVED / totalMonth) * 360
                            }deg,
                            #3b82f6 ${(ms.RESOLVED / totalMonth) * 360
                            }deg ${((ms.RESOLVED + ms.IN_PROGRESS) / totalMonth) * 360
                            }deg,
                            #facc15 ${((ms.RESOLVED + ms.IN_PROGRESS) / totalMonth) *
                            360
                            }deg 360deg
                          )`,
                        }}
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
                          รวมทั้งหมด:{" "}
                          <span className="font-bold text-gray-900">
                            {totalMonth}
                          </span>{" "}
                          คำร้อง
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="h-[220px] flex flex-col items-center justify-center text-gray-400 text-sm">
                    <div className="w-[120px] h-[120px] rounded-full border border-dashed border-gray-300 mb-3" />
                    ยังไม่มีข้อมูลในช่วงนี้
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Agent stats table */}
          {!loading && !error && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-6 shadow-sm print-avoid-break">
              <h3 className="mt-0 mb-1 text-xl font-bold text-gray-800">
                👩‍💻 สถานะคำร้องตามเจ้าหน้าที่ (Agent)
              </h3>
              <p className="text-xs text-gray-400 mb-4">{rangeText}</p>

              {agentStats.length === 0 ? (
                <div className="py-6 text-center text-gray-500 text-sm">
                  ยังไม่มีข้อมูลเจ้าหน้าที่ในช่วงนี้
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">
                          #
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">
                          ชื่อเจ้าหน้าที่
                        </th>
                        <th className="text-left px-3 py-2 font-semibold text-gray-700">
                          อีเมล
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700">
                          กำลังดำเนินการ (IN_PROGRESS)
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700">
                          แก้ไขแล้ว (RESOLVED)
                        </th>
                        <th className="text-right px-3 py-2 font-semibold text-gray-700">
                          รวม
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {agentStats.map((row, idx) => {
                        const total = row.inProgress + row.resolved;
                        return (
                          <tr
                            key={row.agentId}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="px-3 py-2 text-gray-500">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2 text-gray-900">
                              {row.name || "-"}
                            </td>
                            <td className="px-3 py-2 text-gray-700">
                              {row.email}
                            </td>
                            <td className="px-3 py-2 text-right text-blue-700 font-semibold">
                              {row.inProgress}
                            </td>
                            <td className="px-3 py-2 text-right text-green-700 font-semibold">
                              {row.resolved}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900">
                              {total}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Back Button */}
          <button
            type="button"
            onClick={() => nav("/admin")}
            className="mt-6 py-2 px-5 rounded-lg border border-gray-300 bg-white cursor-pointer hover:bg-gray-50 transition-all inline-flex items-center text-center font-medium shadow-sm hover:shadow no-print"
          >
            <MdArrowBack className="mr-2" /> กลับหน้าหลัก ADMIN
          </button>
        </div>
      </div>
    </div>
  );
}


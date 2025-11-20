// src/pages/AdminStatsPage.tsx
import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useNavigate } from "react-router-dom";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { MdArrowBack } from "react-icons/md";

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

export default function AdminStatsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [monthStats, setMonthStats] = useState<MonthStatusStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadAll(targetYear: number) {
    try {
      setLoading(true);
      setError(null);

      const [ysRes, msRes] = await Promise.all([
        fetch(`${API_BASE}/admin/stats/year?year=${targetYear}`, {
          credentials: "include",
        }),
        fetch(
          `${API_BASE}/admin/stats/month?year=${targetYear}&month=${
            now.getMonth() + 1
          }`,
          { credentials: "include" }
        ),
      ]);

      if (!ysRes.ok) throw new Error(`โหลดข้อมูลปีไม่สำเร็จ (${ysRes.status})`);
      if (!msRes.ok)
        throw new Error(`โหลดข้อมูลเดือนไม่สำเร็จ (${msRes.status})`);

      const ysJson = (await ysRes.json()) as YearStats;
      const msJson = (await msRes.json()) as MonthStatusStats;

      setYearStats(ysJson);
      setMonthStats(msJson);
    } catch (e: any) {
      console.error(e);
      setError(e.message ?? "โหลดข้อมูลสถิติไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  if (authLoading || !user) {
    return <div className="p-10">Checking your access…</div>;
  }

  const monthName = now.toLocaleString("th-TH", { month: "long" });

  // prepare graph data
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
      <div className="flex items-center gap-2">
        <span
          className="w-3.5 h-3.5 rounded-full"
          style={{ background: props.color }}
        />
        <span className="flex-1">{props.label}</span>
        <span>
          {props.value} ({percent}%)
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 box-border font-sans">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl p-5">
        <AppHeaderBackend user={user} title={"Admin"} />

        {/* Main */}
        <div className="mt-4">
          <div className="flex justify-between gap-3 items-center flex-wrap">
            <h2 className="m-0">แสดงผลสถิติ</h2>
            {/* year selector: current year ± 2 years */}
            <div>
              <label className="mr-2 text-sm">ปี:</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value, 10))}
                className="py-1 px-2.5 rounded-full border border-gray-300 text-sm"
              >
                {[-1, 0, 1].map((offset) => {
                  const y = now.getFullYear() + offset;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {error && <p className="text-red-500 mt-2">{error}</p>}

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Bar chart */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mt-0 mb-1">จำนวนคำร้องแยกตามเดือน (ปี {year})</h3>
              {loading ? (
                <p>กำลังโหลด...</p>
              ) : (
                <div className="mt-3 h-[220px] flex flex-col">
                  <div className="flex-1 flex items-end gap-2">
                    {monthly.map((m) => {
                      const h = (m.count / maxCount) * 160;
                      return (
                        <div
                          key={m.month}
                          className="flex-1 flex flex-col items-center"
                        >
                          <div className="h-40 w-full flex items-end justify-center">
                            <div
                              className="w-[60%] rounded-md bg-green-500"
                              style={{ height: `${h}px` }}
                            />
                          </div>
                          <div className="mt-1 text-[0.7rem] text-gray-600">
                            {m.month}
                          </div>
                          <div className="text-[0.7rem]">{m.count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pie chart */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="mt-0 mb-1">สถานะคำร้องในเดือน {monthName}</h3>
              {loading ? (
                <p>กำลังโหลด...</p>
              ) : (
                <>
                  <div className="mt-3 flex justify-center">
                    <div
                      className="w-[180px] h-[180px] rounded-full"
                      style={{ background: pieBackground }}
                    />
                  </div>

                  <div className="mt-3 flex flex-col gap-1 text-sm">
                    <LegendItem
                      color="#22c55e"
                      label="RESOLVED"
                      value={ms.RESOLVED}
                      total={totalMonth}
                    />
                    <LegendItem
                      color="#3b82f6"
                      label="IN_PROGRESS"
                      value={ms.IN_PROGRESS}
                      total={totalMonth}
                    />
                    <LegendItem
                      color="#facc15"
                      label="OPEN"
                      value={ms.OPEN}
                      total={totalMonth}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => nav("/admin")}
            className="mt-4 py-1.5 px-4 rounded-full border border-gray-300 bg-white cursor-pointer hover:bg-gray-50 transition-colors inline-flex items-center text-center"
          >
            <MdArrowBack className="mr-1" /> กลับหน้าหลัก Admin
          </button>
        </div>
      </div>
    </div>
  );
}

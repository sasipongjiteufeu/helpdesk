import { AgentRow, formatDuration } from "../../lib/adminStatsApi";

interface AgentPerformanceTableProps {
  agents: AgentRow[];
}

export default function AgentPerformanceTable({ agents }: AgentPerformanceTableProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print-avoid-break sm:p-5">
      <h3 className="m-0 text-lg font-bold text-slate-900">ผลงานเจ้าหน้าที่ (Agent)</h3>
      <p className="m-0 mt-1 text-sm text-slate-500">อิงจากเจ้าหน้าที่หลัก (assignedTo) ในช่วงวันที่ที่เลือก</p>

      {agents.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          ไม่มีข้อมูลในช่วงวันที่ที่เลือก
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">ชื่อเจ้าหน้าที่</th>
                <th className="px-3 py-2">อีเมล</th>
                <th className="px-3 py-2 text-right">กำลังดำเนินการ</th>
                <th className="px-3 py-2 text-right">ปิดแล้ว</th>
                <th className="px-3 py-2 text-right">เวลาเฉลี่ยปิด</th>
                <th className="px-3 py-2 text-right">คะแนนเฉลี่ย</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((row, index) => (
                <tr key={row.agentId} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="px-3 py-3 text-slate-500">{index + 1}</td>
                  <td className="px-3 py-3 font-medium text-slate-900">{row.name || "-"}</td>
                  <td className="px-3 py-3 text-slate-700">{row.email}</td>
                  <td className="px-3 py-3 text-right font-semibold text-blue-700">{row.inProgress}</td>
                  <td className="px-3 py-3 text-right font-semibold text-emerald-700">{row.resolved}</td>
                  <td className="px-3 py-3 text-right text-slate-700">
                    {formatDuration(row.avgResolveSeconds)}
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-amber-700">
                    {row.avgRating != null ? `${row.avgRating.toFixed(1)} / 5` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

interface SlaChartProps {
  withinTarget: number;
  overTarget: number;
}

const COLORS = ["#22c55e", "#f97316"];

export default function SlaChart({ withinTarget, overTarget }: SlaChartProps) {
  const data = [
    { name: "ปิดภายใน 3 วัน", value: withinTarget },
    { name: "เกิน 3 วัน", value: overTarget },
  ];
  const total = withinTarget + overTarget;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print-avoid-break sm:p-5">
      <h3 className="m-0 text-lg font-bold text-slate-900">SLA การปิด Ticket</h3>
      <p className="m-0 mt-1 text-sm text-slate-500">เกณฑ์มาตรฐาน 3 วัน (Ticket ที่ปิดในช่วงวันที่ที่เลือก)</p>
      {total === 0 ? (
        <div className="mt-8 grid h-56 place-items-center text-sm text-slate-500">
          ไม่มี Ticket ที่ปิดในช่วงวันที่ที่เลือก
        </div>
      ) : (
        <>
          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {data.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} รายการ`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1 text-sm">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: COLORS[index] }} />
                  {item.name}
                </span>
                <span className="font-semibold text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MonthlyItem } from "../../lib/adminStatsApi";

const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

interface MonthlyTicketChartProps {
  monthly: MonthlyItem[];
  year: number;
}

export default function MonthlyTicketChart({ monthly, year }: MonthlyTicketChartProps) {
  const data = monthly.map((item) => ({
    name: monthNames[item.month - 1] ?? String(item.month),
    count: item.count ?? 0,
  }));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print-avoid-break sm:p-5">
      <h3 className="m-0 text-lg font-bold text-slate-900">จำนวน Ticket รายเดือน ({year})</h3>
      <p className="m-0 mt-1 text-sm text-slate-500">นับจากวันที่สร้าง Ticket</p>
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value) => [`${value} รายการ`, "จำนวน"]} />
            <Bar dataKey="count" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

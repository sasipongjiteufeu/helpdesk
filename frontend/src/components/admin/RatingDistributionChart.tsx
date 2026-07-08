import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RatingDistributionStats } from "../../lib/adminStatsApi";

interface RatingDistributionChartProps {
  stats: RatingDistributionStats;
}

export default function RatingDistributionChart({ stats }: RatingDistributionChartProps) {
  const totalRated = Number(stats.totalRated) || 0;
  const averageRating = stats.averageRating != null ? Number(stats.averageRating) : null;

  const chartData = (stats.distribution ?? []).map((item) => ({
    ratingLabel: `${item.rating} ดาว`,
    count: Number(item.count) || 0,
  }));

  const hasData = totalRated > 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print-avoid-break sm:p-5">
      <h3 className="m-0 text-lg font-bold text-slate-900">การกระจายคะแนนความพึงพอใจ</h3>
      <p className="m-0 mt-1 text-sm text-slate-500">
        {hasData ? (
          <>
            คะแนนเฉลี่ย{" "}
            <span className="font-semibold text-amber-700">
              {averageRating != null ? averageRating.toFixed(2) : "-"}
            </span>{" "}
            จาก {totalRated} รายการ
          </>
        ) : (
          "ยังไม่มีข้อมูลคะแนนในช่วงวันที่ที่เลือก"
        )}
      </p>

      {hasData ? (
        <div className="mt-4 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="ratingLabel" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [`${Number(value) || 0} รายการ`, "จำนวน"]}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="count" fill="#eab308" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="mt-4 flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 text-center text-sm text-slate-500">
          ยังไม่มีข้อมูลคะแนนความพึงพอใจ
        </div>
      )}
    </div>
  );
}

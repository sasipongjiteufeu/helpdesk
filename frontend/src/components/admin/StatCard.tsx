interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: "blue" | "emerald" | "amber" | "rose" | "slate";
}

const accentClasses = {
  blue: "border-blue-100 bg-blue-50/40 text-blue-700",
  emerald: "border-emerald-100 bg-emerald-50/40 text-emerald-700",
  amber: "border-amber-100 bg-amber-50/40 text-amber-700",
  rose: "border-rose-100 bg-rose-50/40 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
};

export default function StatCard({
  title,
  value,
  subtitle,
  accent = "slate",
}: StatCardProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm print-avoid-break ${accentClasses[accent]}`}>
      <p className="m-0 text-sm font-semibold text-slate-600">{title}</p>
      <p className="m-0 mt-2 text-3xl font-bold text-slate-950">{value}</p>
      {subtitle ? (
        <p className="m-0 mt-1 text-xs leading-relaxed text-slate-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

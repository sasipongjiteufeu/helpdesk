import { API_BASE, cachedJsonFetch } from "./api";

export interface MonthlyItem {
  month: number;
  count: number;
}

export interface YearStats {
  year: number;
  monthly: MonthlyItem[];
}

export interface StatusStats {
  OPEN: number;
  IN_PROGRESS: number;
  RESOLVED: number;
}

export interface RangeStats {
  range: { from: string; to: string };
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  resolvedTickets: number;
  avgTimeToFirstActionSeconds: number | null;
  avgTimeToResolveSeconds: number | null;
  resolvedWithinTargetCount: number;
  resolvedWithinTargetPercent: number;
  ratedTickets: number;
  unratedResolvedTickets: number;
  avgRating: number | null;
}

export interface RatingDistributionStats {
  averageRating: number | null;
  totalRated: number;
  distribution: Array<{ rating: number; count: number }>;
}

export interface AgentRow {
  agentId: string;
  email: string;
  name?: string | null;
  inProgress: number;
  resolved: number;
  avgResolveSeconds: number | null;
  avgRating: number | null;
}

export interface AgentStatsResponse {
  agents: AgentRow[];
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null) return "-";
  const s = Math.abs(seconds);
  if (s === 0) return "0 วินาที";

  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} วัน`);
  if (hours > 0) parts.push(`${hours} ชม.`);
  if (minutes > 0) parts.push(`${minutes} นาที`);
  if (secs > 0 && days === 0) parts.push(`${secs} วินาที`);

  return parts.length ? parts.join(" ") : "0 วินาที";
}

export async function fetchAdminDashboardData(params: {
  from: string;
  to: string;
  year: number;
}) {
  const qs = `from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}`;

  const [yearResult, rangeResult, statusResult, ratingResult, agentResult] =
    await Promise.all([
      cachedJsonFetch<YearStats>(`${API_BASE}/admin/stats/year?year=${params.year}`, {
        credentials: "include",
      }, 60),
      cachedJsonFetch<RangeStats>(`${API_BASE}/admin/stats-range?${qs}`, {
        credentials: "include",
      }, 60),
      cachedJsonFetch<StatusStats>(`${API_BASE}/admin/stats/status-range?${qs}`, {
        credentials: "include",
      }, 60),
      cachedJsonFetch<RatingDistributionStats>(`${API_BASE}/admin/stats/ratings?${qs}`, {
        credentials: "include",
      }, 60),
      cachedJsonFetch<AgentStatsResponse>(`${API_BASE}/admin/stats/agents-range?${qs}`, {
        credentials: "include",
      }, 60),
    ]);

  return {
    yearStats: yearResult.data,
    rangeStats: rangeResult.data,
    statusStats: statusResult.data,
    ratingStats: ratingResult.data,
    agentStats: agentResult.data.agents ?? [],
  };
}

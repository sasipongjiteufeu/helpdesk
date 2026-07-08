// src/pages/User.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { MdDelete, MdHome, MdOutlineAddCircle, MdRefresh } from "react-icons/md";
import { FaCircleInfo, FaUserShield } from "react-icons/fa6";
import { FaStar } from "react-icons/fa";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { API_BASE, cachedJsonFetch, invalidateFrontendCache, TicketRating } from "../lib/api";
import { MobileCardListSkeleton, PageSkeleton, TableSkeleton } from "../components/Skeleton";
import TicketRatingModal from "../components/TicketRatingModal";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  assignedTo?: { name?: string | null } | null;
  unreadMessageCount?: number | null;
  hasUnreadMessages?: boolean | null;
  lastMessageAt?: string | null;
  rating?: TicketRating | null;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "ปิดแล้ว",
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const base =
    "inline-flex min-w-fit shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-semibold leading-none shadow-sm";
  const dot = "inline-block h-2.5 w-2.5 shrink-0 rounded-full";

  switch (status) {
    case "OPEN":
      return (
        <span className={`${base} bg-amber-100 text-amber-900`}>
          <span className={`${dot} bg-amber-500`} /> {STATUS_LABELS.OPEN}
        </span>
      );
    case "IN_PROGRESS":
      return (
        <span className={`${base} bg-blue-100 text-blue-900`}>
          <span className={`${dot} bg-blue-500`} /> {STATUS_LABELS.IN_PROGRESS}
        </span>
      );
    case "RESOLVED":
      return (
        <span className={`${base} bg-emerald-100 text-emerald-900`}>
          <span className={`${dot} bg-emerald-500`} /> {STATUS_LABELS.RESOLVED}
        </span>
      );
    default:
      return <span className={base}>{status}</span>;
  }
}

function UnreadBadge({ ticket }: { ticket: Ticket }) {
  const count = ticket.unreadMessageCount ?? 0;
  const shouldShow = count > 0 || ticket.hasUnreadMessages;
  if (!shouldShow) return null;

  return (
    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-600 px-2 text-xs font-bold leading-none text-white shadow-sm motion-safe:animate-pulse">
      {count > 99 ? "99+" : count || "!"}
    </span>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function needsRating(ticket: Ticket) {
  return ticket.status === "RESOLVED" && !ticket.rating;
}

export default function UserTicketsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ratingTicket, setRatingTicket] = useState<Ticket | null>(null);

  async function loadTickets() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const { data } = await cachedJsonFetch<{ items?: Ticket[] }>(`${API_BASE}/tickets/mine`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user?.email,
          page: 1,
          limit: 50,
        }),
      }, 10);
      setTickets(data.items ?? []);
    } catch (e: any) {
      setError(e.message || "ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;

    loadTickets();
    const intervalId = setInterval(() => {
      loadTickets();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [user]);

  const todayActiveCount = useMemo(() => {
    const today = new Date().toDateString();
    return tickets.filter(
      (t) =>
        t.status === "IN_PROGRESS" &&
        new Date(t.createdAt).toDateString() === today,
    ).length;
  }, [tickets]);

  const todaywaitingCount = useMemo(() => {
    const today = new Date().toDateString();
    return tickets.filter(
      (t) =>
        t.status === "OPEN" &&
        new Date(t.createdAt).toDateString() === today,
    ).length;
  }, [tickets]);

  async function handleDelete(id: number) {
    try {
      const result = await Swal.fire({
        title: "ลบคำร้องนี้หรือไม่?",
        text: `Ticket ${id} จะถูกลบถาวร`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#e11d48",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "ลบคำร้อง",
        cancelButtonText: "ยกเลิก",
      });

      if (result.isConfirmed) {
        const res = await fetch(`${API_BASE}/tickets/${id}`, {
          method: "DELETE",
          credentials: "include",
        });

        if (!res.ok) {
          await Swal.fire({
            title: "ลบไม่สำเร็จ",
            text: `ไม่สามารถลบได้ (status ${res.status})`,
            icon: "error",
          });
          return;
        }

        invalidateFrontendCache("/tickets/");
        setTickets((prev) => prev.filter((t) => t.id !== id));
        await Swal.fire({
          title: "ลบแล้ว",
          icon: "success",
          showConfirmButton: false,
          timer: 1200,
        });
      }
    } catch (e: any) {
      await Swal.fire({
        title: "ลบไม่สำเร็จ",
        text: e.message ?? "ลบไม่สำเร็จ",
        icon: "error",
      });
    }
  }

  if (authLoading || !user) {
    return <PageSkeleton />;
  }

  function ActionButtons({ ticket, compact = false }: { ticket: Ticket; compact?: boolean }) {
    const canDelete = ticket.status === "OPEN";

    const btnClass =
      "inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold whitespace-nowrap";

    return (
      <div
        className={
          compact
            ? "flex flex-wrap items-center justify-end gap-2"
            : "flex flex-wrap items-center justify-end gap-2"
        }
      >
        <button
          type="button"
          onClick={() => navigate(`/user/ticket/${ticket.id}`)}
          className={cx(
            btnClass,
            "border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100",
          )}
        >
          <FaCircleInfo className="shrink-0 text-[0.7rem]" /> รายละเอียด
          <UnreadBadge ticket={ticket} />
        </button>
        <button
          type="button"
          onClick={canDelete ? () => handleDelete(ticket.id) : undefined}
          disabled={!canDelete}
          className={cx(
            btnClass,
            canDelete
              ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
              : "cursor-not-allowed bg-slate-100 text-slate-400",
          )}
          title={canDelete ? "ลบคำร้อง" : "ลบไม่ได้หลังจากเริ่มดำเนินการ"}
        >
          <MdDelete className="shrink-0 text-sm" /> ลบ
        </button>

        {ticket.status === "RESOLVED" &&
          (ticket.rating ? (
            <span
              className={cx(
                btnClass,
                "border border-emerald-200 bg-emerald-50 text-emerald-700",
              )}
            >
              <FaStar className="shrink-0 text-[0.65rem] text-emerald-500" /> ให้แล้ว{" "}
              {ticket.rating.rating} ดาว
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setRatingTicket(ticket)}
              title="ยังไม่ได้ให้คะแนน"
              className={cx(
                btnClass,
                "border border-yellow-300 bg-yellow-50 font-bold text-yellow-800 shadow-sm transition hover:bg-yellow-100 motion-safe:animate-pulse",
              )}
            >
              <FaStar className="shrink-0 text-[0.65rem] text-yellow-500" /> ให้คะแนน
            </button>
          ))}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1800px] space-y-5">
        <AppHeaderBackend user={user} title="USER" />

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <p className="m-0 text-sm font-semibold text-blue-600">User Dashboard</p>
              <h2 className="m-0 mt-1 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                งานของฉัน
              </h2>
              <p className="m-0 mt-2 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
                ติดตามสถานะคำร้องและการดำเนินงานของคุณ
              </p>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => (window.location.href = "/")}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <MdHome className="text-lg" /> หน้าสาธารณะ
              </button>

              {user?.roles && user.roles.length > 1 && (
                <button
                  type="button"
                  onClick={() => (window.location.href = "/choose-role")}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
                >
                  <FaUserShield className="text-lg" /> เลือกบทบาท
                </button>
              )}

              <Link
                to="/user/create"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <MdOutlineAddCircle className="text-lg" /> สร้างคำร้องใหม่
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="m-0 text-sm font-semibold text-slate-500">คำร้องทั้งหมด</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <strong className="text-3xl font-bold text-slate-950">{tickets.length}</strong>
              <span className="inline-flex min-w-fit shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-semibold leading-none text-slate-700">
                รายการ
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:p-5">
            <p className="m-0 text-sm font-semibold text-slate-500">กำลังดำเนินการวันนี้</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <strong className="text-3xl font-bold text-blue-700">{todayActiveCount}</strong>
              <StatusBadge status="IN_PROGRESS" />
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm sm:col-span-2 sm:p-5 xl:col-span-1">
            <p className="m-0 text-sm font-semibold text-slate-500">รอดำเนินการวันนี้</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <strong className="text-3xl font-bold text-amber-700">{todaywaitingCount}</strong>
              <StatusBadge status="OPEN" />
            </div>
          </div>
        </section>

        {error && (
          <div className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadTickets}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              <MdRefresh /> ลองใหม่
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <h3 className="m-0 text-lg font-bold text-slate-950">รายการคำร้องของฉัน</h3>
              <p className="m-0 mt-1 text-sm text-slate-500">แสดงคำร้องที่คุณสร้างไว้ในระบบ Helpdesk</p>
            </div>
            <span className="inline-flex min-w-fit shrink-0 items-center whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-sm font-semibold leading-none text-slate-700">
              {tickets.length} รายการ
            </span>
          </div>

          {loading ? (
            <div className="p-3">
              <div className="hidden md:block">
                <TableSkeleton rows={6} columns={7} className="border-0 shadow-none" showHeader={false} />
              </div>
              <MobileCardListSkeleton count={3} />
            </div>
          ) : (
          <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3">สถานะ</th>
                  <th className="whitespace-nowrap px-4 py-3">Ticket ID</th>
                  <th className="px-4 py-3">หัวข้อ</th>
                  <th className="whitespace-nowrap px-4 py-3">เบอร์ติดต่อ</th>
                  <th className="whitespace-nowrap px-4 py-3">ผู้รับผิดชอบ</th>
                  <th className="whitespace-nowrap px-4 py-3">สร้างเมื่อ</th>
                  <th className="min-w-[17rem] whitespace-nowrap px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                      ยังไม่มีคำร้อง
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => (
                    <tr
                      key={t.id}
                      className={cx(
                        "border-l-4 border-transparent transition-colors hover:bg-slate-50",
                        needsRating(t) &&
                          "border-yellow-300 bg-yellow-50/60",
                        !needsRating(t) && Boolean(t.unreadMessageCount || t.hasUnreadMessages) &&
                          "bg-blue-50/60 ring-1 ring-inset ring-blue-200 motion-safe:animate-pulse",
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-4 align-top">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-700">
                            {String(t.id).padStart(7, "0")}
                          </span>
                          <UnreadBadge ticket={t} />
                        </div>
                      </td>
                      <td className="max-w-[18rem] px-4 py-4 align-top font-semibold text-slate-950">
                        <div className="line-clamp-2 break-words">{t.title}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-slate-600">
                        {t.tel ?? "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-slate-700">
                        {t.assignedTo?.name || "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-top text-slate-600">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 align-middle text-right">
                        <ActionButtons ticket={t} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-3 md:hidden">
            {tickets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                ยังไม่มีคำร้อง
              </div>
            ) : (
              tickets.map((t) => (
                <article
                  key={t.id}
                  className={cx(
                    "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm",
                    needsRating(t) &&
                      "border-yellow-200 bg-yellow-50/60",
                    !needsRating(t) && Boolean(t.unreadMessageCount || t.hasUnreadMessages) &&
                      "border-blue-200 bg-blue-50/60 ring-1 ring-blue-200 motion-safe:animate-pulse",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-slate-500">
                          #{String(t.id).padStart(7, "0")}
                        </span>
                        <UnreadBadge ticket={t} />
                      </div>
                      <h3 className="m-0 mt-1 line-clamp-2 text-base font-bold text-slate-950">
                        {t.title}
                      </h3>
                    </div>
                    <StatusBadge status={t.status} />
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-slate-600">
                    <div>
                      เบอร์ติดต่อ: <span className="font-semibold text-slate-800">{t.tel ?? "-"}</span>
                    </div>
                    <div>
                      ผู้รับผิดชอบ: <span className="font-semibold text-slate-800">{t.assignedTo?.name || "-"}</span>
                    </div>
                    <div>
                      สร้างเมื่อ: <span className="font-semibold text-slate-800">{formatDate(t.createdAt)}</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <ActionButtons ticket={t} compact />
                  </div>
                </article>
              ))
            )}
          </div>
          </>
          )}
        </section>
      </div>
      <TicketRatingModal
        open={Boolean(ratingTicket)}
        ticketId={ratingTicket?.id}
        rating={ratingTicket?.rating}
        onClose={() => setRatingTicket(null)}
        onRated={(rating) => {
          setTickets((current) =>
            current.map((item) =>
              item.id === ratingTicket?.id ? { ...item, rating } : item,
            ),
          );
        }}
      />
    </div>
  );
}

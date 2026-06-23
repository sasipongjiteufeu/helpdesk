import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack, MdDoneAll, MdPlayArrow } from "react-icons/md";
import AppHeaderBackend from "../components/AppHeaderBackend";
import TicketConversation from "../components/TicketConversation";
import { useRequireAuth } from "../hooks/useRequireAuth";
import {
  API_BASE,
  joinTicket,
  postTicketParticipantsList,
  TicketParticipant,
} from "../lib/api";
import {
  DetailField,
  ErrorBanner,
  LoadingState,
  STATUS_LABELS,
  StatusBadge,
  TicketAttachmentGrid,
  TicketImageDto,
  TicketStatus,
  formatDateTime,
} from "../components/helpdesk-ui";

interface TicketUserRef {
  id?: string;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
}

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  updatedAt?: string;
  createdBy?: TicketUserRef | null;
  assignedTo?: TicketUserRef | null;
  lastStatusChangedBy?: TicketUserRef | null;
}

export default function AgentTicketInfoPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<TicketImageDto[]>([]);
  const [participants, setParticipants] = useState<TicketParticipant[]>([]);
  const [joining, setJoining] = useState(false);
  const [statusSaving, setStatusSaving] = useState<TicketStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [ticketRes, imageRes, participantData] = await Promise.all([
        fetch(`${API_BASE}/tickets/${id}`, { credentials: "include" }),
        fetch(`${API_BASE}/tickets/${id}/images`, { credentials: "include" }),
        postTicketParticipantsList(id, { page: 1, limit: 50 }).catch(() => null),
      ]);

      if (!ticketRes.ok) throw new Error(`โหลดข้อมูล Ticket ไม่สำเร็จ (${ticketRes.status})`);
      setTicket((await ticketRes.json()) as Ticket);

      if (imageRes.ok) {
        setAttachments((await imageRes.json()) as TicketImageDto[]);
      } else {
        setAttachments([]);
      }

      setParticipants(participantData?.items ?? []);
    } catch (e: any) {
      setError(e.message ?? "โหลดข้อมูล Ticket ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  const handleStatusChange = useCallback(
    async (next: TicketStatus) => {
      if (!id) return;
      try {
        setStatusSaving(next);
        setError(null);
        const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        if (!res.ok) throw new Error(`เปลี่ยนสถานะไม่สำเร็จ (${res.status})`);
        setTicket((await res.json()) as Ticket);
      } catch (e: any) {
        setError(e.message ?? "เปลี่ยนสถานะไม่สำเร็จ");
      } finally {
        setStatusSaving(null);
      }
    },
    [id],
  );

  async function handleJoinTicket() {
    if (!id) return;
    try {
      setJoining(true);
      setError(null);
      await joinTicket(id);
      const [ticketRes, participantData] = await Promise.all([
        fetch(`${API_BASE}/tickets/${id}`, { credentials: "include" }),
        postTicketParticipantsList(id, { page: 1, limit: 50 }),
      ]);
      if (ticketRes.ok) setTicket((await ticketRes.json()) as Ticket);
      setParticipants(participantData.items ?? []);
    } catch (e: any) {
      setError(e.message ?? "เข้าร่วม Ticket ไม่สำเร็จ");
    } finally {
      setJoining(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <LoadingState label="กำลังตรวจสอบสิทธิ์..." />
      </div>
    );
  }

  const isStaff = user.roles?.some((role) => role.name === "AGENT" || role.name === "ADMIN");
  const isPrimaryAgent = ticket?.assignedTo?.id === user.id;
  const isActiveParticipant = participants.some((participant) => participant.agent?.id === user.id);
  const canJoin =
    Boolean(isStaff) &&
    ticket?.status === "IN_PROGRESS" &&
    !isPrimaryAgent &&
    !isActiveParticipant;

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-4 text-slate-900 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1800px] space-y-5">
        <AppHeaderBackend user={user} title="AGENT" />

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="m-0 text-sm font-semibold text-blue-600">รายละเอียด Ticket</p>
            <h2 className="m-0 mt-1 text-2xl font-bold text-slate-950">
              {ticket ? `#${String(ticket.id).padStart(7, "0")} ${ticket.title}` : "Ticket"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => nav("/agent")}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <MdArrowBack /> กลับหน้ารายการ
          </button>
        </div>

        {error && <ErrorBanner message={error} onRetry={loadTicket} />}

        {loading || !ticket ? (
          <LoadingState label="กำลังโหลดข้อมูล..." />
        ) : (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="m-0 text-lg font-semibold text-slate-950">ข้อมูลคำร้อง</h3>
                    <p className="m-0 text-sm text-slate-500">รายละเอียดและสถานะปัจจุบัน</p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label="Ticket ID" value={String(ticket.id).padStart(7, "0")} />
                  <DetailField label="สถานะ" value={STATUS_LABELS[ticket.status]} />
                  <DetailField label="หัวข้อ" value={ticket.title} />
                  <DetailField label="เบอร์ติดต่อ" value={ticket.tel || "-"} />
                  <DetailField label="ผู้แจ้ง" value={ticket.createdBy?.name || ticket.createdBy?.email || "-"} />
                  <DetailField label="เจ้าหน้าที่หลัก" value={ticket.assignedTo?.name || ticket.assignedTo?.email || "-"} />
                  <DetailField label="วันที่สร้าง" value={formatDateTime(ticket.createdAt)} />
                  <DetailField label="แก้ไขล่าสุด" value={formatDateTime(ticket.updatedAt)} />
                  <div className="sm:col-span-2">
                    <DetailField label="รายละเอียด" value={ticket.detail} />
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 text-sm font-semibold text-slate-700">เปลี่ยนสถานะ Ticket</div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      disabled={statusSaving !== null || ticket.status === "IN_PROGRESS"}
                      onClick={() => handleStatusChange("IN_PROGRESS")}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {statusSaving === "IN_PROGRESS" ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <MdPlayArrow />
                      )}
                      เปลี่ยนเป็นกำลังดำเนินการ
                    </button>
                    <button
                      type="button"
                      disabled={statusSaving !== null || ticket.status === "RESOLVED"}
                      onClick={() => handleStatusChange("RESOLVED")}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {statusSaving === "RESOLVED" ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <MdDoneAll />
                      )}
                      ปิดงาน
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="m-0 text-lg font-semibold text-slate-950">ไฟล์แนบ</h3>
                <div className="mt-3">
                  <TicketAttachmentGrid files={attachments} />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="m-0 text-lg font-semibold text-slate-950">ผู้ดูแล Ticket</h3>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium text-slate-500">เจ้าหน้าที่หลัก</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {ticket.assignedTo?.name || ticket.assignedTo?.email || "-"}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-semibold text-slate-700">เจ้าหน้าที่ร่วม</div>
                  {participants.length === 0 ? (
                    <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      ยังไม่มีเจ้าหน้าที่ร่วม
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {participants.map((participant) => (
                        <span
                          key={participant.id}
                          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800"
                        >
                          {participant.agent?.name || participant.agent?.email || "ไม่ทราบชื่อ"}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isPrimaryAgent && (
                  <div className="mt-3 text-sm font-semibold text-emerald-700">
                    คุณเป็นเจ้าหน้าที่หลักของ Ticket นี้
                  </div>
                )}
                {isActiveParticipant && !isPrimaryAgent && (
                  <div className="mt-3 text-sm font-semibold text-blue-700">
                    คุณเข้าร่วมดูแล Ticket นี้แล้ว
                  </div>
                )}
                {canJoin && (
                  <button
                    type="button"
                    onClick={handleJoinTicket}
                    disabled={joining}
                    className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {joining ? "กำลังเข้าร่วม..." : "เข้าร่วม Ticket"}
                  </button>
                )}
              </section>
            </div>

            <TicketConversation ticketId={ticket.id} currentUser={user} />
          </div>
        )}
      </div>
    </div>
  );
}

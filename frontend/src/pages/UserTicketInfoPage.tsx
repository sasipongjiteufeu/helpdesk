import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack } from "react-icons/md";
import AppHeaderBackend from "../components/AppHeaderBackend";
import TicketConversation from "../components/TicketConversation";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { API_BASE } from "../lib/api";
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
  name?: string | null;
  email?: string | null;
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

export default function UserTicketInfoPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<TicketImageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const [ticketRes, imageRes] = await Promise.all([
        fetch(`${API_BASE}/tickets/${id}`, { credentials: "include" }),
        fetch(`${API_BASE}/tickets/${id}/images`, { credentials: "include" }),
      ]);

      if (!ticketRes.ok) throw new Error(`โหลดข้อมูล Ticket ไม่สำเร็จ (${ticketRes.status})`);
      setTicket((await ticketRes.json()) as Ticket);

      if (imageRes.ok) {
        setAttachments((await imageRes.json()) as TicketImageDto[]);
      } else {
        setAttachments([]);
      }
    } catch (e: any) {
      setError(e.message ?? "โหลดข้อมูล Ticket ไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-100 p-4">
        <LoadingState label="กำลังตรวจสอบสิทธิ์..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-4 text-slate-900 sm:px-6 lg:px-8 xl:px-10">
      <div className="mx-auto w-full max-w-[1800px] space-y-5">
        <AppHeaderBackend user={user} title="USER" />

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="m-0 text-sm font-semibold text-blue-600">รายละเอียด Ticket</p>
            <h2 className="m-0 mt-1 text-2xl font-bold text-slate-950">
              {ticket ? `#${String(ticket.id).padStart(7, "0")} ${ticket.title}` : "Ticket"}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => nav("/user")}
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
                    <p className="m-0 text-sm text-slate-500">ข้อมูลที่ส่งเข้าระบบ Helpdesk</p>
                  </div>
                  <StatusBadge status={ticket.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <DetailField label="Ticket ID" value={String(ticket.id).padStart(7, "0")} />
                  <DetailField label="สถานะ" value={STATUS_LABELS[ticket.status]} />
                  <DetailField label="หัวข้อ" value={ticket.title} />
                  <DetailField label="เบอร์ติดต่อ" value={ticket.tel || "-"} />
                  <DetailField label="ผู้แจ้ง" value={ticket.createdBy?.name || user.name || "-"} />
                  <DetailField label="เจ้าหน้าที่หลัก" value={ticket.assignedTo?.name || ticket.assignedTo?.email || "ยังไม่มีเจ้าหน้าที่รับงาน"} />
                  <DetailField label="วันที่สร้าง" value={formatDateTime(ticket.createdAt)} />
                  <DetailField label="แก้ไขล่าสุด" value={formatDateTime(ticket.updatedAt)} />
                  <div className="sm:col-span-2">
                    <DetailField label="รายละเอียด" value={ticket.detail} />
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="m-0 text-lg font-semibold text-slate-950">ไฟล์แนบ</h3>
                <div className="mt-3">
                  <TicketAttachmentGrid files={attachments} />
                </div>
              </section>
            </div>

            <TicketConversation ticketId={ticket.id} currentUser={user} />
          </div>
        )}
      </div>
    </div>
  );
}

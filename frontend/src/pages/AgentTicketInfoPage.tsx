import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdAdd, MdArrowBack, MdDelete, MdDoneAll, MdPersonAdd, MdPlayArrow } from "react-icons/md";
import AppHeaderBackend from "../components/AppHeaderBackend";
import TicketConversation from "../components/TicketConversation";
import AddTicketAgentModal from "../components/AddTicketAgentModal";
import { useRequireAuth } from "../hooks/useRequireAuth";
import {
  API_BASE,
  createTicketTag,
  deleteTicketTag,
  invalidateFrontendCache,
  postTicketParticipantsList,
  postTicketTagsList,
  removeTicketAgent,
  TicketRating,
  TicketTag,
  TicketParticipant,
} from "../lib/api";
import TicketRatingReadOnly from "../components/TicketRatingReadOnly";
import {
  DetailField,
  ErrorBanner,
  STATUS_LABELS,
  StatusBadge,
  TicketAttachmentGrid,
  TicketImageDto,
  TicketStatus,
  formatDateTime,
} from "../components/helpdesk-ui";
import { PageSkeleton, TicketDetailSkeleton } from "../components/Skeleton";

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
  rating?: TicketRating | null;
}

export default function AgentTicketInfoPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<TicketImageDto[]>([]);
  const [participants, setParticipants] = useState<TicketParticipant[]>([]);
  const [tags, setTags] = useState<TicketTag[]>([]);
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tagSaving, setTagSaving] = useState(false);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [removingAgentId, setRemovingAgentId] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState<TicketStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const [ticketRes, imageRes, participantData, tagData] = await Promise.all([
        fetch(`${API_BASE}/tickets/${id}`, { credentials: "include" }),
        fetch(`${API_BASE}/tickets/${id}/images`, { credentials: "include" }),
        postTicketParticipantsList(id, { page: 1, limit: 50 }).catch(() => null),
        postTicketTagsList(id, { page: 1, limit: 50 }).catch(() => null),
      ]);

      if (!ticketRes.ok) throw new Error(`โหลดข้อมูล Ticket ไม่สำเร็จ (${ticketRes.status})`);
      setTicket((await ticketRes.json()) as Ticket);

      if (imageRes.ok) {
        setAttachments((await imageRes.json()) as TicketImageDto[]);
      } else {
        setAttachments([]);
      }

      setParticipants(participantData?.items ?? []);
      setTags(tagData?.items ?? []);
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
        invalidateFrontendCache("/tickets/");
        await loadTicket();
      } catch (e: any) {
        setError(e.message ?? "เปลี่ยนสถานะไม่สำเร็จ");
      } finally {
        setStatusSaving(null);
      }
    },
    [id],
  );

  async function handleRemoveAgent(agentId?: string | null) {
    if (!id || !agentId || removingAgentId) return;
    const confirmed = window.confirm("นำผู้ร่วมดำเนินการออกจาก Ticket นี้หรือไม่?");
    if (!confirmed) return;

    try {
      setRemovingAgentId(agentId);
      setError(null);
      await removeTicketAgent(id, agentId);
      const participantData = await postTicketParticipantsList(id, { page: 1, limit: 50 });
      setParticipants(participantData.items ?? []);
    } catch (e: any) {
      setError(e.message ?? "นำผู้ร่วมดำเนินการออกไม่สำเร็จ");
    } finally {
      setRemovingAgentId(null);
    }
  }

  async function refreshParticipants() {
    if (!id) return;
    const participantData = await postTicketParticipantsList(id, { page: 1, limit: 50 });
    setParticipants(participantData.items ?? []);
  }

  async function handleCreateTag() {
    if (!id || tagSaving) return;
    const value = tagInput.trim();
    if (!value) return;

    try {
      setTagSaving(true);
      setError(null);
      const created = await createTicketTag(id, value);
      setTags((current) => {
        const withoutDuplicate = current.filter((tag) => tag.id !== created.id);
        return [...withoutDuplicate, created];
      });
      setTagInput("");
      setShowTagInput(false);
    } catch (e: any) {
      setError(e.message ?? "เพิ่ม tag ไม่สำเร็จ");
    } finally {
      setTagSaving(false);
    }
  }

  async function handleDeleteTag(tag: TicketTag) {
    if (!id || !tag.canDelete || deletingTagId) return;
    const confirmed = window.confirm(`ลบ ${tag.displayName || `#${tag.name}`} หรือไม่?`);
    if (!confirmed) return;

    try {
      setDeletingTagId(tag.id);
      setError(null);
      await deleteTicketTag(id, tag.id);
      setTags((current) => current.filter((item) => item.id !== tag.id));
    } catch (e: any) {
      setError(e.message ?? "ลบ tag ไม่สำเร็จ");
    } finally {
      setDeletingTagId(null);
    }
  }

  if (authLoading || !user) {
    return <PageSkeleton><TicketDetailSkeleton /></PageSkeleton>;
  }

  const isStaff = user.roles?.some((role) => role.name === "AGENT" || role.name === "ADMIN");
  const isAdmin = user.roles?.some((role) => role.name === "ADMIN");
  const isPrimaryAgent = ticket?.assignedTo?.id === user.id;
  const isActiveParticipant = participants.some((participant) => participant.agent?.id === user.id);
  const canAct =
    Boolean(isAdmin) ||
    Boolean(isPrimaryAgent) ||
    Boolean(isActiveParticipant) ||
    (Boolean(isStaff) && ticket?.status === "OPEN" && !ticket?.assignedTo);
  const canManageParticipants =
    Boolean(isPrimaryAgent) &&
    Boolean(ticket?.assignedTo) &&
    ticket?.status !== "RESOLVED";
  const waitingForInvite =
    Boolean(isStaff) &&
    Boolean(ticket?.assignedTo) &&
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
            {ticket && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {tags.map((tag) => {
                  const displayName = tag.displayName || `#${tag.name}`;
                  const canDelete = Boolean(tag.canDelete);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      disabled={!canDelete || deletingTagId === tag.id}
                      onClick={() => handleDeleteTag(tag)}
                      title={canDelete ? "ลบ tag นี้" : displayName}
                      className={`inline-flex min-w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold leading-none transition ${
                        canDelete
                          ? "cursor-pointer border-slate-200 bg-slate-100 text-slate-700 hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700 disabled:cursor-wait disabled:opacity-60"
                          : "cursor-default border-slate-200 bg-slate-100 text-slate-700"
                      }`}
                    >
                      <span>{displayName}</span>
                      {canDelete && <MdDelete className="text-sm" />}
                    </button>
                  );
                })}

                {showTagInput ? (
                  <input
                    autoFocus
                    value={tagInput}
                    disabled={tagSaving}
                    maxLength={81}
                    placeholder="เพิ่ม tag แล้วกด Enter"
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleCreateTag();
                      }
                      if (event.key === "Escape") {
                        setShowTagInput(false);
                        setTagInput("");
                      }
                    }}
                    onBlur={() => {
                      if (!tagInput.trim()) setShowTagInput(false);
                    }}
                    className="h-8 w-56 max-w-full rounded-full border border-blue-200 bg-white px-3 text-xs font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTagInput(true)}
                    className="inline-grid h-8 w-8 place-items-center rounded-full border border-blue-200 bg-blue-50 text-blue-700 transition hover:bg-blue-100"
                    title="เพิ่ม tag"
                    aria-label="เพิ่ม tag"
                  >
                    <MdAdd />
                  </button>
                )}
              </div>
            )}
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
          <TicketDetailSkeleton />
        ) : (
          <div className="grid items-stretch gap-5 xl:min-h-[650px] xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]">
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
                  {canAct ? (
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
                  ) : (
                    <p className="m-0 text-sm text-slate-600">
                      ต้องให้ Agent เจ้าของ Ticket เพิ่มชื่อก่อน จึงจะร่วมดำเนินการได้
                    </p>
                  )}
                </div>
              </section>

              {(ticket.status === "RESOLVED" || ticket.rating) && (
                <TicketRatingReadOnly
                  rating={ticket.rating}
                  resolved={ticket.status === "RESOLVED"}
                />
              )}

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="m-0 text-lg font-semibold text-slate-950">ไฟล์แนบ</h3>
                <div className="mt-3">
                  <TicketAttachmentGrid files={attachments} />
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <h3 className="m-0 text-lg font-semibold text-slate-950">ผู้ดูแล Ticket</h3>
                  {canManageParticipants && (
                    <button
                      type="button"
                      onClick={() => setShowAgentModal(true)}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      <MdPersonAdd /> เพิ่มผู้ร่วมดำเนินการ
                    </button>
                  )}
                </div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-medium text-slate-500">ผู้รับผิดชอบหลัก</div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {ticket.assignedTo?.name || ticket.assignedTo?.email || "-"}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-sm font-semibold text-slate-700">ผู้ร่วมดำเนินการ</div>
                  {participants.length === 0 ? (
                    <div className="mt-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                      ยังไม่มีผู้ร่วมดำเนินการเพิ่มเติม
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {participants.map((participant) => (
                        <span
                          key={participant.id}
                          className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800"
                        >
                          {participant.agent?.name || participant.agent?.email || "ไม่ทราบชื่อ"}
                          {canManageParticipants && participant.agent?.id && (
                            <button
                              type="button"
                              disabled={removingAgentId === participant.agent.id}
                              onClick={() => handleRemoveAgent(participant.agent?.id)}
                              className="grid h-5 w-5 place-items-center rounded-full text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                              title="นำออก"
                              aria-label="นำผู้ร่วมดำเนินการออก"
                            >
                              <MdDelete className="text-sm" />
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isPrimaryAgent && (
                  <div className="mt-3 text-sm font-semibold text-emerald-700">
                    คุณเป็นผู้รับผิดชอบหลักของ Ticket นี้
                  </div>
                )}
                {isActiveParticipant && !isPrimaryAgent && (
                  <div className="mt-3 text-sm font-semibold text-blue-700">
                    คุณเป็นผู้ร่วมดำเนินการของ Ticket นี้
                  </div>
                )}
                {waitingForInvite && (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    ต้องให้ Agent เจ้าของ Ticket เพิ่มชื่อก่อน จึงจะร่วมดำเนินการได้
                  </div>
                )}
              </section>
            </div>

            <TicketConversation ticketId={ticket.id} currentUser={user} canReply={canAct} />
          </div>
        )}
      </div>

      <AddTicketAgentModal
        open={showAgentModal}
        ticketId={ticket?.id ?? id ?? ""}
        primaryAgentId={ticket?.assignedTo?.id}
        existingParticipants={participants}
        onClose={() => setShowAgentModal(false)}
        onAdded={async () => {
          await refreshParticipants();
          setShowAgentModal(false);
        }}
      />
    </div>
  );
}

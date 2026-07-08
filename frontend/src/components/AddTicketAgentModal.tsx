import { useEffect, useMemo, useState } from "react";
import { MdClose, MdPersonAdd, MdSearch } from "react-icons/md";
import { addTicketAgents, AgentUserOption, fetchAgentUsers, TicketParticipant } from "../lib/api";

interface AddTicketAgentModalProps {
  open: boolean;
  ticketId: string | number;
  primaryAgentId?: string | null;
  existingParticipants: TicketParticipant[];
  onClose: () => void;
  onAdded: () => void;
}

export default function AddTicketAgentModal({
  open,
  ticketId,
  primaryAgentId,
  existingParticipants,
  onClose,
  onAdded,
}: AddTicketAgentModalProps) {
  const [search, setSearch] = useState("");
  const [agents, setAgents] = useState<AgentUserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeParticipantIds = useMemo(
    () => new Set(existingParticipants.map((item) => item.agent?.id).filter(Boolean) as string[]),
    [existingParticipants],
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchAgentUsers(search);
        if (!cancelled) setAgents(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "โหลดรายชื่อ Agent ไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, search]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setAgents([]);
      setError(null);
      setAddingId(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleAdd(agentId: string) {
    try {
      setAddingId(agentId);
      setError(null);
      await addTicketAgents(ticketId, [agentId]);
      onAdded();
    } catch (e: any) {
      setError(e.message ?? "เพิ่มผู้ร่วมดำเนินการไม่สำเร็จ");
    } finally {
      setAddingId(null);
    }
  }

  const visibleAgents = agents.filter((agent) => agent.id !== primaryAgentId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="m-0 text-lg font-bold text-slate-950">เพิ่มผู้ร่วมดำเนินการ</h3>
            <p className="m-0 mt-1 text-sm text-slate-500">
              เลือกเจ้าหน้าที่ที่มีสิทธิ์ AGENT เท่านั้น
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="ปิด"
          >
            <MdClose />
          </button>
        </div>

        <div className="border-b border-slate-100 px-5 py-3">
          <label className="relative block">
            <MdSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาชื่อหรืออีเมล Agent"
              className="h-10 w-full rounded-xl border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
        </div>

        {error && (
          <div className="mx-5 mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="py-8 text-center text-sm text-slate-500">กำลังโหลด...</div>
          ) : visibleAgents.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">ไม่พบ Agent ที่ตรงกับการค้นหา</div>
          ) : (
            <ul className="space-y-2">
              {visibleAgents.map((agent) => {
                const alreadyAdded = activeParticipantIds.has(agent.id);
                return (
                  <li
                    key={agent.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900">
                        {agent.name || agent.email}
                      </div>
                      {agent.name && (
                        <div className="truncate text-xs text-slate-500">{agent.email}</div>
                      )}
                    </div>
                    {alreadyAdded ? (
                      <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        เพิ่มแล้ว
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={addingId === agent.id}
                        onClick={() => handleAdd(agent.id)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                      >
                        <MdPersonAdd />
                        {addingId === agent.id ? "กำลังเพิ่ม..." : "เพิ่ม"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

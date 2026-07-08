import { useEffect, useState } from "react";
import { TicketRating, submitTicketRating } from "../lib/api";
import RatingStars from "./RatingStars";

function useEscapeKey(onEscape: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onEscape();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onEscape]);
}

interface TicketRatingModalProps {
  open: boolean;
  ticketId?: number | string | null;
  rating?: TicketRating | null;
  onClose: () => void;
  onRated: (rating: TicketRating) => void;
}

export default function TicketRatingModal({
  open,
  ticketId,
  rating,
  onClose,
  onRated,
}: TicketRatingModalProps) {
  const [selected, setSelected] = useState(rating?.rating ?? 0);
  const [comment, setComment] = useState(rating?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSelected(rating?.rating ?? 0);
    setComment(rating?.comment ?? "");
    setError(null);
  }, [open, rating]);

  useEscapeKey(onClose, open);

  if (!open || !ticketId) return null;
  const resolvedTicketId = ticketId;

  async function handleSubmit() {
    if (selected < 1 || selected > 5) {
      setError("กรุณาเลือกคะแนน 1-5 ดาว");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const saved = await submitTicketRating(resolvedTicketId, {
        rating: selected,
        comment,
      });
      onRated(saved);
      onClose();
    } catch (e: any) {
      setError(e.message ?? "บันทึกคะแนนไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-rating-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-w-0">
          <h3 id="ticket-rating-modal-title" className="m-0 text-xl font-bold text-slate-950">
            ให้คะแนนความพึงพอใจ
          </h3>
          <p className="m-0 mt-2 max-w-full whitespace-normal break-words text-sm leading-relaxed text-slate-600">
            การให้คะแนนไม่บังคับ และสามารถให้คะแนนภายหลังได้
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-yellow-100 bg-yellow-50/70 p-4">
          <RatingStars value={selected} onChange={setSelected} size="lg" />
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="ความคิดเห็นเพิ่มเติม (ไม่บังคับ)"
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
        />

        {error && (
          <p className="m-0 mt-3 max-w-full whitespace-normal break-words text-sm font-semibold leading-relaxed text-red-700">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            ไว้ภายหลัง
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || selected < 1}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-yellow-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-yellow-200"
          >
            {saving ? "กำลังบันทึก..." : "ส่งคะแนน"}
          </button>
        </div>
      </div>
    </div>
  );
}

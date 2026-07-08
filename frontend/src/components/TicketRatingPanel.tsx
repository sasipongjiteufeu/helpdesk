import { useEffect, useState } from "react";
import { TicketRating, submitTicketRating } from "../lib/api";
import RatingStars from "./RatingStars";

interface TicketRatingPanelProps {
  ticketId: number | string;
  rating?: TicketRating | null;
  onRated?: (rating: TicketRating) => void;
}

export default function TicketRatingPanel({
  ticketId,
  rating,
  onRated,
}: TicketRatingPanelProps) {
  const [selected, setSelected] = useState(rating?.rating ?? 0);
  const [comment, setComment] = useState(rating?.comment ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSelected(rating?.rating ?? 0);
    setComment(rating?.comment ?? "");
    setSuccess(false);
    setError(null);
  }, [rating]);

  async function handleSubmit() {
    if (selected < 1 || selected > 5) {
      setError("กรุณาเลือกคะแนน 1-5 ดาว");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const saved = await submitTicketRating(ticketId, {
        rating: selected,
        comment,
      });
      setSuccess(true);
      onRated?.(saved);
    } catch (e: any) {
      setError(e.message ?? "บันทึกคะแนนไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full max-w-2xl rounded-3xl border border-yellow-200 bg-yellow-50/70 p-4 text-yellow-950 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="m-0 text-lg font-bold text-slate-950">
            ให้คะแนนความพึงพอใจ
          </h3>
          <p className="m-0 mt-1 max-w-full whitespace-normal break-words text-sm leading-relaxed text-yellow-900">
            {rating
              ? `คุณให้คะแนน ${rating.rating} ดาวแล้ว สามารถแก้ไขคะแนนได้`
              : "การให้คะแนนไม่บังคับ และสามารถให้คะแนนภายหลังได้"}
          </p>
        </div>

        {rating && (
          <span className="inline-flex w-fit shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            ให้แล้ว {rating.rating} ดาว
          </span>
        )}
      </div>

      <div className="mt-4 rounded-2xl border border-yellow-100 bg-white/80 p-3">
        <RatingStars value={selected} onChange={setSelected} size="lg" />
      </div>

      <label className="mt-4 block text-sm font-semibold text-slate-700">
        ความคิดเห็นเพิ่มเติม
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
          rows={4}
          placeholder="ไม่บังคับกรอก"
          className="mt-2 w-full rounded-2xl border border-yellow-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
        />
      </label>

      {error && (
        <p className="m-0 mt-3 max-w-full whitespace-normal break-words text-sm font-semibold leading-relaxed text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="m-0 mt-3 max-w-full whitespace-normal break-words text-sm font-semibold leading-relaxed text-emerald-700">
          ขอบคุณสำหรับการให้คะแนน
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || selected < 1}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full bg-yellow-500 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-yellow-600 disabled:cursor-not-allowed disabled:bg-yellow-200"
        >
          {saving ? "กำลังบันทึก..." : rating ? "อัปเดตคะแนน" : "ส่งคะแนน"}
        </button>
        <span className="min-w-0 max-w-full flex-1 whitespace-normal break-words text-xs font-medium leading-relaxed text-yellow-900">
          การให้คะแนนไม่บังคับ และสามารถให้คะแนนภายหลังได้
        </span>
      </div>
    </div>
  );
}

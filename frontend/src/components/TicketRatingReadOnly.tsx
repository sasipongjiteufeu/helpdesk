import { TicketRating } from "../lib/api";
import { formatDateTime } from "./helpdesk-ui";
import RatingStars from "./RatingStars";

interface TicketRatingReadOnlyProps {
  rating?: TicketRating | null;
  resolved?: boolean;
}

export default function TicketRatingReadOnly({
  rating,
  resolved = false,
}: TicketRatingReadOnlyProps) {
  if (!resolved && !rating) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4">
        <h3 className="m-0 text-lg font-semibold text-slate-950">
          คะแนนความพึงพอใจจากผู้ใช้
        </h3>
        <p className="m-0 mt-1 text-sm leading-relaxed text-slate-500">
          ข้อมูลนี้มาจากผู้แจ้ง Ticket เท่านั้น เจ้าหน้าที่ไม่สามารถแก้ไขคะแนนแทนได้
        </p>
      </div>

      {rating ? (
        <div className="max-w-2xl space-y-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="m-0 text-sm font-medium text-slate-600">คะแนนที่ให้</p>
              <p className="m-0 mt-1 text-lg font-bold text-emerald-800">
                {rating.rating} ดาว
              </p>
            </div>
            <RatingStars value={rating.rating} readonly size="md" />
          </div>

          <div>
            <p className="m-0 text-sm font-medium text-slate-600">ความคิดเห็นเพิ่มเติม</p>
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800">
              {rating.comment?.trim()
                ? rating.comment
                : "ไม่มีความคิดเห็นเพิ่มเติม"}
            </div>
          </div>

          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div>
              ให้คะแนนเมื่อ:{" "}
              <span className="font-semibold text-slate-800">
                {formatDateTime(rating.createdAt)}
              </span>
            </div>
            {rating.user?.name || rating.user?.email ? (
              <div>
                โดย:{" "}
                <span className="font-semibold text-slate-800">
                  {rating.user.name || rating.user.email}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="max-w-2xl rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-medium leading-relaxed text-yellow-900">
          ผู้ใช้ยังไม่ได้ให้คะแนนความพึงพอใจ
        </div>
      )}
    </section>
  );
}

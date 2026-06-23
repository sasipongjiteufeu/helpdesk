import React from "react";
import { MdErrorOutline, MdInbox, MdRefresh } from "react-icons/md";
import { API_BASE } from "../lib/api";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

export interface TicketImageDto {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  size?: number | null;
  path?: string | null;
  url?: string | null;
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "เสร็จสิ้น",
};

export function formatDateTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(size?: number | null) {
  if (!size || !Number.isFinite(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const classes: Record<TicketStatus, string> = {
    OPEN: "border-amber-200 bg-amber-50 text-amber-800",
    IN_PROGRESS: "border-blue-200 bg-blue-50 text-blue-800",
    RESOLVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  };

  return (
    <span
      className={cx(
        "inline-flex min-w-fit shrink-0 items-center justify-center whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-semibold leading-none",
        classes[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export function LoadingState({ label = "กำลังโหลดข้อมูล..." }: { label?: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
      <div>
        <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
        <p className="m-0 text-sm font-medium">{label}</p>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div>
        <MdInbox className="mx-auto mb-3 text-4xl text-slate-400" />
        <p className="m-0 text-base font-semibold text-slate-700">{title}</p>
        {description && <p className="m-0 mt-1 text-sm text-slate-500">{description}</p>}
      </div>
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <MdErrorOutline className="mt-0.5 shrink-0 text-xl" />
        <div>
          <div className="font-semibold">เกิดข้อผิดพลาด</div>
          <div className="text-sm">{message}</div>
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
        >
          <MdRefresh /> ลองใหม่
        </button>
      )}
    </div>
  );
}

export function DetailField({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-slate-900">
        {value || "-"}
      </div>
    </div>
  );
}

function mediaUrl(file: TicketImageDto) {
  if (file.url) return `${API_BASE}${file.url}`;
  if (file.path) return `${API_BASE}/${file.path}`;
  return "";
}

export function TicketAttachmentGrid({ files }: { files: TicketImageDto[] }) {
  if (!files.length) {
    return <EmptyState title="ไม่มีไฟล์แนบ" description="Ticket นี้ยังไม่มีไฟล์แนบ" />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {files.map((file) => {
        const href = mediaUrl(file);
        const isImage = file.mimeType?.startsWith("image/");
        return (
          <a
            key={file.id}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 no-underline shadow-sm transition hover:border-blue-200 hover:shadow-md"
          >
            {isImage && href ? (
              <img
                src={href}
                alt={file.filename || "ไฟล์แนบ"}
                className="h-40 w-full bg-slate-100 object-cover"
              />
            ) : (
              <div className="grid h-40 place-items-center bg-slate-100 px-4 text-center text-sm font-semibold text-slate-600">
                {file.filename || "ไฟล์แนบ"}
              </div>
            )}
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="truncate">{file.filename || "ไฟล์แนบ"}</span>
              <span className="shrink-0 text-xs text-slate-500">
                {formatBytes(file.size)}
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

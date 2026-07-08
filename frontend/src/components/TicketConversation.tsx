import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  MdArchive,
  MdAttachFile,
  MdClose,
  MdDescription,
  MdImage,
  MdInsertDriveFile,
  MdOpenInNew,
  MdPictureAsPdf,
  MdSend,
} from "react-icons/md";
import {
  API_BASE,
  createTicketMessage,
  getAttachmentUrl,
  markTicketMessagesAsRead,
  postTicketMessagesList,
  RoleEnum,
  TicketMessage,
  TicketMessageAttachment,
  User,
} from "../lib/api";
import { EmptyState, ErrorBanner, formatBytes, cx } from "./helpdesk-ui";
import { TicketConversationSkeleton } from "./Skeleton";

interface TicketConversationProps {
  ticketId: string | number;
  currentUser: User;
  canReply?: boolean;
}

function roleText(user: { roles?: RoleEnum[] | { name?: RoleEnum }[] }) {
  return (
    user.roles
      ?.map((role) => (typeof role === "string" ? role : role.name))
      .filter(Boolean)
      .join(", ") || "USER"
  );
}

function attachmentHref(
  ticketId: string | number,
  messageId: string,
  attachment: TicketMessageAttachment,
) {
  if (!attachment.url) return getAttachmentUrl(ticketId, messageId, attachment.id);
  if (attachment.url.startsWith("http")) return attachment.url;
  const apiOrigin = API_BASE.replace(/\/api$/, "");
  return attachment.url.startsWith("/api/")
    ? `${apiOrigin}${attachment.url}`
    : `${API_BASE}${attachment.url}`;
}

function AttachmentIcon({ mimeType }: { mimeType?: string }) {
  const className = "text-2xl text-slate-600";
  if (mimeType?.startsWith("image/")) return <MdImage className={className} />;
  if (mimeType === "application/pdf") return <MdPictureAsPdf className={className} />;
  if (mimeType === "application/zip" || mimeType?.includes("compressed")) {
    return <MdArchive className={className} />;
  }
  if (mimeType?.startsWith("text/") || mimeType?.includes("document")) {
    return <MdDescription className={className} />;
  }
  return <MdInsertDriveFile className={className} />;
}

function AttachmentFallbackCard({
  attachment,
  href,
}: {
  attachment: TicketMessageAttachment;
  href: string | null;
}) {
  const content = (
    <div className="flex min-w-0 items-center gap-3 px-3 py-3">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100">
        <AttachmentIcon mimeType={attachment.mimeType} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-800">
          {attachment.originalName || "ไฟล์แนบ"}
        </div>
        <div className="truncate text-xs text-slate-500">
          {attachment.mimeType || "ไม่ทราบชนิดไฟล์"} {formatBytes(attachment.size)}
        </div>
        {!href && (
          <div className="mt-1 text-xs font-medium text-rose-600">
            ไม่สามารถเปิดไฟล์แนบได้
          </div>
        )}
      </div>
      {href && <MdOpenInNew className="shrink-0 text-slate-500" />}
    </div>
  );

  if (!href) {
    return (
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white/90 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      download={!attachment.mimeType?.startsWith("image/") ? attachment.originalName : undefined}
      className="block overflow-hidden rounded-xl border border-slate-200 bg-white/90 text-slate-800 no-underline shadow-sm transition hover:bg-slate-50"
    >
      {content}
    </a>
  );
}

function FilePreviewCard({
  ticketId,
  message,
  attachment,
}: {
  ticketId: string | number;
  message: TicketMessage;
  attachment: TicketMessageAttachment;
}) {
  const href = attachmentHref(ticketId, message.id, attachment);
  const isImage = attachment.mimeType?.startsWith("image/");
  const [imageFailed, setImageFailed] = useState(false);

  if (!href || !isImage || imageFailed) {
    return <AttachmentFallbackCard attachment={attachment} href={href || null} />;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-xl border border-slate-200 bg-white/90 text-slate-800 no-underline shadow-sm"
    >
      <img
        src={href}
        alt=""
        onError={() => setImageFailed(true)}
        className="max-h-52 w-full bg-slate-100 object-contain"
      />
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <span className="truncate text-sm">{attachment.originalName}</span>
        <span className="shrink-0 text-xs text-slate-500">
          {formatBytes(attachment.size)}
        </span>
      </div>
    </a>
  );
}

export default function TicketConversation({
  ticketId,
  currentUser,
  canReply = true,
}: TicketConversationProps) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const canSend = useMemo(
    () => canReply && (message.trim().length > 0 || files.length > 0),
    [canReply, files.length, message],
  );

  async function loadMessages() {
    try {
      setLoading(true);
      setError(null);
      const data = await postTicketMessagesList(ticketId, {
        page: 1,
        limit: 50,
        search: "",
        sort: "ASC",
      });
      setMessages(data.items);
      markTicketMessagesAsRead(ticketId).catch(() => undefined);
    } catch (e: any) {
      setError(e.message ?? "โหลดข้อความไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await postTicketMessagesList(ticketId, {
          page: 1,
          limit: 50,
          search: "",
          sort: "ASC",
        });
        if (!cancelled) {
          setMessages(data.items);
          markTicketMessagesAsRead(ticketId).catch(() => undefined);
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "โหลดข้อความไม่สำเร็จ");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages.length, sending]);

  function handleFiles(selected: FileList | null) {
    const next = Array.from(selected ?? []);
    setFiles((prev) => [...prev, ...next].slice(0, 10));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSend || sending) return;

    try {
      setSending(true);
      setError(null);
      const formData = new FormData();
      if (message.trim()) formData.append("message", message.trim());
      files.forEach((file) => formData.append("attachments", file));

      const created = await createTicketMessage(ticketId, formData);
      setMessages((prev) => [...prev, created]);
      setMessage("");
      setFiles([]);
    } catch (e: any) {
      setError(e.message ?? "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="flex h-full min-h-[34rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm xl:min-h-[650px]">
      <div className="shrink-0 border-b border-slate-200 px-4 py-3">
        <h3 className="m-0 text-lg font-semibold text-slate-950">การสนทนา</h3>
        <p className="m-0 text-xs text-slate-500">
          Ticket #{String(ticketId).padStart(7, "0")}
        </p>
      </div>

      {error && (
        <div className="shrink-0 px-4 pt-4">
          <ErrorBanner message={error} onRetry={loadMessages} />
        </div>
      )}

      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-4"
      >
        {loading ? (
          <div className="-m-4">
            <TicketConversationSkeleton />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState title="ยังไม่มีข้อความใน Ticket นี้" />
        ) : (
          messages.map((item) => {
            const mine = item.sender?.id === currentUser.id;
            return (
              <div key={item.id} className={cx("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[92%] rounded-2xl px-4 py-3 shadow-sm md:max-w-[72%]",
                    mine
                      ? "rounded-br-md bg-blue-600 text-white"
                      : "rounded-bl-md border border-slate-200 bg-white text-slate-900",
                  )}
                >
                  <div className={cx("mb-1 text-xs", mine ? "text-blue-100" : "text-slate-500")}>
                    <span className="font-semibold">
                      {item.sender?.name || item.sender?.email || "ไม่ทราบผู้ส่ง"}
                    </span>
                    <span> • {roleText(item.sender)}</span>
                    <span> • {new Date(item.createdAt).toLocaleString("th-TH")}</span>
                  </div>
                  {item.message && (
                    <div className="whitespace-pre-wrap break-words text-sm leading-6">
                      {item.message}
                    </div>
                  )}
                  {item.attachments?.length > 0 && (
                    <div className="mt-3 grid gap-2">
                      {item.attachments.map((attachment) => (
                        <FilePreviewCard
                          key={attachment.id}
                          ticketId={ticketId}
                          message={item}
                          attachment={attachment}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {files.length > 0 && (
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-3">
          <div className="mb-2 text-xs font-semibold text-slate-500">
            ไฟล์ที่เลือก {files.length}/10
          </div>
          <div className="flex flex-wrap gap-2">
            {files.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-700"
              >
                <span className="max-w-48 truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="grid h-5 w-5 place-items-center rounded-full hover:bg-slate-200"
                  aria-label={`ลบ ${file.name}`}
                >
                  <MdClose />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-200 bg-white p-3">
        {!canReply ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            ต้องให้ Agent เจ้าของ Ticket เพิ่มชื่อก่อน จึงจะส่งข้อความใน Ticket นี้ได้
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            accept="image/png,image/jpeg,image/webp,application/pdf,text/plain,application/zip"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
            aria-label="แนบไฟล์"
            title="แนบไฟล์"
          >
            <MdAttachFile className="text-xl" />
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 5000))}
            rows={2}
            maxLength={5000}
            placeholder="พิมพ์ข้อความ..."
            className="min-h-11 max-h-32 flex-1 resize-none overflow-y-auto rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!canSend || sending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="ส่งข้อความ"
            title="ส่งข้อความ"
          >
            {sending ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <MdSend className="text-xl" />
            )}
          </button>
            </div>
            <div className="mt-1 text-right text-xs text-slate-400">
              {message.length}/5000
            </div>
          </>
        )}
      </form>
    </section>
  );
}

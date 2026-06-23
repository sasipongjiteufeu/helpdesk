import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { MdAttachFile, MdClose, MdSend } from "react-icons/md";
import {
  API_BASE,
  createTicketMessage,
  getAttachmentUrl,
  getTicketMessages,
  TicketMessage,
  TicketMessageAttachment,
  User,
} from "../lib/api";

interface TicketConversationProps {
  ticketId: string | number;
  currentUser: User;
}

function formatBytes(size: number) {
  if (!Number.isFinite(size)) return "";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function roleText(user: User) {
  return user.roles?.map((role) => role.name).filter(Boolean).join(", ") || "USER";
}

function attachmentHref(
  ticketId: string | number,
  messageId: string,
  attachment: TicketMessageAttachment,
) {
  return attachment.url
    ? `${API_BASE}${attachment.url}`
    : getAttachmentUrl(ticketId, messageId, attachment.id);
}

function AttachmentList({
  ticketId,
  message,
}: {
  ticketId: string | number;
  message: TicketMessage;
}) {
  if (!message.attachments?.length) return null;

  return (
    <div className="mt-2 grid gap-2">
      {message.attachments.map((attachment) => {
        const href = attachmentHref(ticketId, message.id, attachment);
        const isImage = attachment.mimeType?.startsWith("image/");

        return (
          <a
            key={attachment.id}
            href={href}
            target="_blank"
            rel="noreferrer"
            download={!isImage ? attachment.originalName : undefined}
            className="block rounded-lg border border-gray-200 bg-white/80 overflow-hidden text-sm text-gray-800 no-underline"
          >
            {isImage ? (
              <img
                src={href}
                alt={attachment.originalName}
                className="max-h-56 w-full object-contain bg-gray-100"
              />
            ) : null}
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="truncate">{attachment.originalName}</span>
              <span className="shrink-0 text-xs text-gray-500">
                {formatBytes(attachment.size)}
              </span>
            </div>
          </a>
        );
      })}
    </div>
  );
}

export default function TicketConversation({
  ticketId,
  currentUser,
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
    () => message.trim().length > 0 || files.length > 0,
    [files.length, message],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getTicketMessages(ticketId);
        if (!cancelled) setMessages(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message ?? "Failed to load messages");
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
  }, [messages.length]);

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
      setError(e.message ?? "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white flex flex-col min-h-[32rem] md:col-span-2">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="m-0 text-lg font-semibold text-gray-900">Conversation</h3>
        <p className="m-0 text-xs text-gray-500">Ticket #{String(ticketId).padStart(7, "0")}</p>
      </div>

      {error && (
        <div className="mx-4 mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-900">
          {error}
        </div>
      )}

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 space-y-4 max-h-[60vh]"
      >
        {loading ? (
          <div className="text-sm text-gray-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="h-full min-h-48 grid place-items-center text-sm text-gray-500 text-center">
            No messages yet.
          </div>
        ) : (
          messages.map((item) => {
            const mine = item.sender?.id === currentUser.id;
            return (
              <div
                key={item.id}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[88%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
                    mine
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                  }`}
                >
                  <div className={`mb-1 text-xs ${mine ? "text-blue-100" : "text-gray-500"}`}>
                    <span className="font-semibold">
                      {item.sender?.name || item.sender?.email || "Unknown"}
                    </span>
                    <span> · {roleText(item.sender)}</span>
                    <span> · {new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  {item.message && (
                    <div className="whitespace-pre-wrap break-words text-sm leading-6">
                      {item.message}
                    </div>
                  )}
                  <AttachmentList ticketId={ticketId} message={item} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {files.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-2 flex flex-wrap gap-2">
          {files.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex max-w-full items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
            >
              <span className="truncate max-w-48">{file.name}</span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="grid h-5 w-5 place-items-center rounded-full hover:bg-gray-200"
                aria-label={`Remove ${file.name}`}
              >
                <MdClose />
              </button>
            </span>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-3">
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
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            aria-label="Attach files"
            title="Attach files"
          >
            <MdAttachFile className="text-xl" />
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 5000))}
            rows={2}
            maxLength={5000}
            placeholder="Type a message..."
            className="min-h-11 flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <button
            type="submit"
            disabled={!canSend || sending}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            aria-label="Send message"
            title="Send message"
          >
            <MdSend className="text-xl" />
          </button>
        </div>
        <div className="mt-1 text-right text-xs text-gray-400">
          {message.length}/5000
        </div>
      </form>
    </section>
  );
}

// src/pages/AgentTicketInfoPage.tsx
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { MdArrowBack } from "react-icons/md";
import TicketConversation from "../components/TicketConversation";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

interface TicketUserRef {
  name?: string | null;
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

interface TicketImageDto {
  id: string;
  filename?: string | null;
  mimeType?: string | null;
  size?: number | null;
  path?: string | null;
  url?: string | null;
}

// ----- helper: preview attachment (image / video / download) -----
function MediaPreview({ file }: { file: TicketImageDto }) {
  const { mimeType, filename, url, path } = file;
  const safeMime = mimeType || "application/octet-stream";
  const src = url
    ? `${API_BASE}${url}`
    : path
    ? `${API_BASE}/${path}`
    : undefined;

  if (!src) {
    return (
      <div className="p-3 text-center text-sm text-gray-500">
        ไม่พบไฟล์แนบ
      </div>
    );
  }

  if (safeMime.startsWith("image/")) {
    return (
      <img
        src={src}
        alt={filename || "Ticket image"}
        className="w-full h-full object-cover"
      />
    );
  }

  if (safeMime.startsWith("video/")) {
    return (
      <video controls className="w-full h-full object-cover">
        <source src={src} type={safeMime} />
        Your browser does not support the video tag.
      </video>
    );
  }

  // pdf / doc / etc. → download button
  return (
    <div className="p-3 text-center text-sm">
      <div className="mb-2">{filename || "แนบไฟล์"}</div>
      <a
        href={src}
        download={filename || "attachment"}
        className="inline-block py-1.5 px-3 rounded-full border border-gray-600 no-underline bg-gray-900 text-gray-50 text-[0.85rem] font-semibold hover:bg-gray-800 transition-colors"
      >
        Download
      </a>
    </div>
  );
}

export default function AgentTicketInfoPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [attachments, setAttachments] = useState<TicketImageDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleStatusChange = useCallback(
    async (next: TicketStatus) => {
      try {
        const res = await fetch(`${API_BASE}/tickets/${id}/status`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });

        if (!res.ok) {
          throw new Error(`เปลี่ยนสถานะไม่สำเร็จ (${res.status})`);
        }

        const updated = await res.json();
        setTicket(updated);
      } catch (e: any) {
        alert(e.message ?? "เปลี่ยนสถานะไม่สำเร็จ");
        console.error(e);
      }
    },
    [id]
  );

  useEffect(() => {
    if (!id) return;

    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        // รายละเอียด
        const ticketRes = await fetch(`${API_BASE}/tickets/${id}`, {
          credentials: "include",
        });
        if (!ticketRes.ok) {
          throw new Error(`Failed to load ticket (${ticketRes.status})`);
        }
        const ticketData = (await ticketRes.json()) as Ticket;
        if (!cancelled) setTicket(ticketData);

        // Attachments
        const imgRes = await fetch(`${API_BASE}/tickets/${id}/images`, {
          credentials: "include",
        });
        if (!imgRes.ok) {
          if (!cancelled) setAttachments([]);
        } else {
          const imgs = (await imgRes.json()) as TicketImageDto[];
          if (!cancelled) setAttachments(imgs);
        }
      } catch (e: any) {
        console.error(e);
        if (!cancelled) setError(e.message ?? "Failed to load ticket");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (authLoading || !user) {
    return (
      <div className="min-h-dvh grid place-items-center font-sans bg-gray-100 text-gray-900">
        Checking your access…
      </div>
    );
  }

  function handleExit() {
    nav("/agent");
  }

  function getStatusClassName(status: TicketStatus): string {
    const base = "py-1 px-2.5 rounded-full font-semibold text-xs inline-block";
    switch (status) {
      case "OPEN":
        return `${base} bg-yellow-400 text-black`;
      case "IN_PROGRESS":
        return `${base} bg-blue-500 text-white`;
      case "RESOLVED":
        return `${base} bg-green-500 text-white`;
      default:
        return base;
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-100 p-6 box-border font-sans">
      <div className="container mx-auto bg-white rounded-2xl shadow-2xl p-5">
        <AppHeaderBackend user={user} title={"AGENT"} />

        {/* Content */}
        <div className="mt-4">
          <h2 className="mt-0 mb-3">รายละเอียด</h2>

          {error && (
            <div className="mb-4 py-3 px-4 rounded-lg bg-red-100 text-red-900 text-sm">
              {error}
            </div>
          )}

          {loading || !ticket ? (
            <p>กำลังดาวโหลด...</p>
          ) : (
            <section className="rounded-xl border border-gray-200 bg-gray-50 p-4  flex flex-col md:grid  md:grid-cols-4  gap-6">
              {/* LEFT: attachments */}
              <div className="flex flex-col gap-3 max-h-[70vh] overflow-y-auto pr-1">
                {attachments.length === 0 ? (
                  <div className="w-full aspect-[4/3] rounded-xl border border-gray-300 overflow-hidden bg-white flex items-center justify-center text-sm text-gray-500">
                    <span>ไม่มีไฟล์แนบ</span>
                  </div>
                ) : (
                  attachments.map((file) => (
                    <div
                      key={file.id}
                      className="w-full aspect-[4/3] rounded-xl border border-gray-300 overflow-hidden bg-white flex items-center justify-center text-sm text-gray-500"
                    >
                      <MediaPreview file={file} />
                    </div>
                  ))
                )}
              </div>

              {/* RIGHT: all ticket info */}
              <div className="flex flex-col gap-3">
                <Field
                  label="Ticket ID"
                  value={String(ticket.id).padStart(7, "0")}
                />
                <Field label="หัวข้อ" value={ticket.title} />
                <Field label="รายละเอียดคำร้อง" value={ticket.detail} />
                <Field label="เบอร์ติดต่อ" value={ticket.tel || "-"} />

                <div className="space-y-3">
                  <div className="text-xs opacity-70">สถานะคำร้อง</div>
                  <div className="inline-flex rounded-md shadow-xs">
                    <button
                      type="button"
                      aria-current="page"
                      className={`px-4 py-2 text-sm font-medium  ${
                        ticket.status === "IN_PROGRESS"
                          ? "text-white bg-blue-800"
                          : "text-gray-900 bg-white"
                      } border border-gray-200 rounded-s-lg hover:text-white hover:bg-blue-900 focus:z-10  focus:ring-blue-700 focus:text-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white`}
                      onClick={() => handleStatusChange("IN_PROGRESS")}
                    >
                      กำลังดำเนินการ
                    </button>

                    <button
                      type="button"
                      className={`px-4 py-2 text-sm font-medium   ${
                        ticket.status === "RESOLVED"
                          ? "text-white bg-green-800"
                          : "text-gray-900 bg-white"
                      }  border-t border-b border-gray-200 hover:bg-green-900 hover:text-white focus:z-10 rounded-e-lg focus:ring-green-700 focus:text-white dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:text-white dark:hover:bg-gray-700 dark:focus:ring-blue-500 dark:focus:text-white`}
                      onClick={() => handleStatusChange("RESOLVED")}
                    >
                      ได้รับการแก้ไข
                    </button>
                  </div>

                  <div>
                    <span className={getStatusClassName(ticket.status)}>
                      {ticket.status === "OPEN"
                        ? "เปิด"
                        : ticket.status === "IN_PROGRESS"
                        ? "กำลังดำเนินการ"
                        : "ได้รับการแก้ไข"}
                    </span>
                  </div>
                </div>

                <Field
                  label="ผู้ร้องขอ"
                  value={ticket.createdBy?.name || "-"}
                />
                <Field
                  label="รับงานโดย"
                  value={
                    ticket.assignedTo?.name
                      ? ticket.assignedTo.name
                      : "ยังไม่มีเจ้าหน้าที่รับงาน"
                  }
                />
                <Field
                  label="เปลี่ยนสถานะล่าสุดโดย"
                  value={
                    ticket.lastStatusChangedBy?.name ||
                    "ยังไม่มีเจ้าหน้าที่รับงาน"
                  }
                />
                <Field
                  label="สร้าง ณ วันที่"
                  value={new Date(ticket.createdAt).toLocaleString()}
                />
                <Field
                  label="แก้ไขล่าสุด"
                  value={
                    ticket.updatedAt
                      ? new Date(ticket.updatedAt).toLocaleString()
                      : "-"
                  }
                />

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleExit}
                    className="py-2.5 px-4 rounded-full border-none bg-green-500 text-white font-semibold cursor-pointer hover:bg-green-600 transition-colors inline-flex items-center text-center"
                  >
                    <MdArrowBack className="mr-1" /> กลับไปหน้า AGENT
                  </button>
                </div>
              </div>

              <TicketConversation ticketId={ticket.id} currentUser={user} />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-base">{value}</div>
    </div>
  );
}

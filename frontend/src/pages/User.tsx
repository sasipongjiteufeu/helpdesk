// src/pages/User.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { MdDelete, MdOutlineAddCircle } from "react-icons/md";
import { FaCircleInfo } from "react-icons/fa6";
import Swal from "sweetalert2";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  assignedTo?: { name?: string | null } | null;
}

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "เปิด",
  IN_PROGRESS: "กำลังดำเนินการ",
  RESOLVED: "ปิดแล้ว",
};

export default function UserTicketsPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadTickets() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/tickets?page=1&limit=50`, {
        credentials: "include",
      });
      const data = await res.json();
      setTickets(data.items ?? []);
    } catch (e: any) {
      setError(e.message || "ไม่สามารถดึงข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
    const intervalId = setInterval(() => {
      loadTickets();
    }, 300000);
    return () => clearInterval(intervalId);
  }, []);

  const todayActiveCount = useMemo(() => {
    const today = new Date().toDateString();
    return tickets.filter(
      (t) =>
        t.status === "IN_PROGRESS" &&
        new Date(t.createdAt).toDateString() === today,
    ).length;
  }, [tickets]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-gray-100 text-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p>กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  function StatusBadge({ status }: { status: TicketStatus }) {
    const base =
      "px-3 py-1.5 rounded-full font-semibold text-sm inline-flex items-center gap-2 shadow-sm";
    const dot = "inline-block w-2.5 h-2.5 rounded-full";
    switch (status) {
      case "OPEN":
        return (
          <span className={`${base} bg-amber-100 text-amber-900`}>
            <span className={`${dot} bg-amber-500`} /> {STATUS_LABELS.OPEN}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className={`${base} bg-blue-100 text-blue-900`}>
            <span className={`${dot} bg-blue-500`} /> {STATUS_LABELS.IN_PROGRESS}
          </span>
        );
      case "RESOLVED":
        return (
          <span className={`${base} bg-emerald-100 text-emerald-900`}>
            <span className={`${dot} bg-emerald-500`} /> {STATUS_LABELS.RESOLVED}
          </span>
        );
      default:
        return <span className={base}>{status}</span>;
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleDelete(id: number) {
    try {
      const result = await Swal.fire({
        title: "ลบคำร้องนี้หรือไม่?",
        text: `Ticket ${id} จะถูกลบถาวร`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#e11d48",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "ลบคำร้อง",
        cancelButtonText: "ยกเลิก",
      });

      if (result.isConfirmed) {
        const res = await fetch(`${API_BASE}/tickets/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          alert(`ไม่สามารถลบได้ (status ${res.status})`);
          return;
        }
        setTickets((prev) => prev.filter((t) => t.id !== id));
        await Swal.fire({
          title: "ลบแล้ว",
          icon: "success",
          showConfirmButton: false,
          timer: 1200,
        });
      }
    } catch (e: any) {
      alert(e.message ?? "ลบไม่สำเร็จ");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 py-10 px-4 text-gray-900">
      <div className=" mx-auto bg-white/85 backdrop-blur rounded-3xl shadow-[0_25px_80px_-40px_rgba(15,23,42,0.35)] border border-gray-100 px-8 py-6">
        <AppHeaderBackend user={user} title={"USER"} />

        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              งานของฉัน
            </h2>
            <p className="text-lg text-gray-600">
              วันนี้มีคำร้องที่กำลังดำเนินการ{" "}
              <span className="font-semibold text-emerald-700">
                {todayActiveCount} ticket
              </span>
            </p>
          </div>
          <Link
            to={"/user/create"}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-semibold inline-flex items-center gap-2 shadow-md transition-colors"
          >
            <MdOutlineAddCircle className="text-xl" /> สร้างคำร้องใหม่
          </Link>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-red-800">
            {error}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50/60 overflow-hidden shadow-inner">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-gray-200/80 text-left text-gray-800 text-base md:text-lg">
                <tr>
                  <th className="px-4 py-3 font-semibold">สถานะ</th>
                  <th className="px-4 py-3 font-semibold">Ticket ID</th>
                  <th className="px-4 py-3 font-semibold">หัวข้อ</th>
                  <th className="px-4 py-3 font-semibold">รายละเอียด</th>
                  <th className="px-4 py-3 font-semibold">เบอร์ติดต่อ</th>
                  <th className="px-4 py-3 font-semibold">ผู้รับผิดชอบ</th>
                  <th className="px-4 py-3 font-semibold">สร้างเมื่อ</th>
                  <th className="px-4 py-3 font-semibold text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-base md:text-lg">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      ยังไม่มีคำร้อง
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => {
                    const canDelete = t.status === "OPEN";
                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-gray-800">
                          {String(t.id).padStart(7, "0")}
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900">
                          {t.title}
                        </td>
                        <td className="px-4 py-3 text-gray-700">{t.detail}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {t.tel ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {t.assignedTo?.name || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          {formatDate(t.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => navigate(`/user/ticket/${t.id}`)}
                              className="px-3 py-2 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                            >
                              <FaCircleInfo /> รายละเอียด
                            </button>
                            <button
                              type="button"
                              onClick={
                                canDelete ? () => handleDelete(t.id) : undefined
                              }
                              disabled={!canDelete}
                              className={`px-3 py-2 rounded-full text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
                                canDelete
                                  ? "bg-rose-100 text-rose-700 hover:bg-rose-200"
                                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                              }`}
                              title={
                                canDelete
                                  ? "ลบคำร้อง"
                                  : "ลบไม่ได้หลังจากเริ่มดำเนินการ"
                              }
                            >
                              <MdDelete /> ลบ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

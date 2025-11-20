// src/pages/User.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";

import AppHeaderBackend from "../components/AppHeaderBackend";

type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED";

interface Ticket {
  id: number;
  title: string;
  detail: string;
  tel?: string | null;
  status: TicketStatus;
  createdAt: string;
  assignedTo?: { email?: string | null; name: string } | null;
  lastStatusChangedBy?: { email?: string | null } | null;
}

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
      setError(e.message || "fetch error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTickets();
  }, []);

  if (authLoading || !user) {
    return <div className="p-10">Checking your access…</div>;
  }

  async function handleDelete(id: number) {
    if (!confirm("ต้องการลบคำร้องนี้หรือไม่?")) return;
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        alert(`ไม่สามารถลบคำร้องได้ (status code ${res.status})`);
        return;
      }
      setTickets((prev) => prev.filter((t) => t.id !== id));
    } catch (e: any) {
      alert(e.message ?? "ลบคำร้องไม่สำเร็จ");
    }
  }

  function StatusBadge({ status }: { status: TicketStatus }) {
    const baseClasses =
      "px-2.5 py-1 rounded-full font-semibold text-xs inline-block";

    switch (status) {
      case "OPEN":
        return (
          <span className={`${baseClasses} bg-yellow-400 text-black`}>
            {status}
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className={`${baseClasses} bg-blue-500 text-white`}>
            {status}
          </span>
        );
      case "RESOLVED":
        return (
          <span className={`${baseClasses} bg-green-500 text-white`}>
            {status}
          </span>
        );
      default:
        return <span className={baseClasses}>{status}</span>;
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-2xl p-5">
        {/* Header */}

        <AppHeaderBackend user={user} title={"User"} />

        {/* Section Title */}
        <div className="mt-4 flex  flex-col-reverse md:flex-row justify-between">
          <h2 className="text-2xl font-semibold m-0">รายการคำร้องของฉัน</h2>

          <button
            onClick={() => navigate("/user/create")}
            className="px-4 py-1.5 mb-4 bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold border-none cursor-pointer"
          >
            + Create Ticket
          </button>
        </div>

        {/* Error */}
        {error && <p className="text-red-500 mt-2">{error}</p>}

        {/* Ticket Table */}
        <div className="mt-3 overflow-x-auto">
          {loading ? (
            <p>Loading…</p>
          ) : tickets.length === 0 ? (
            <p>ยังไม่มีรายการคำร้อง</p>
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 border-b-2 border-gray-800">
                    สถานะคำร้อง
                  </th>
                  <th className="text-left p-2 border-b-2 border-gray-800">
                    Ticket ID
                  </th>
                  <th className="text-left p-2 border-b-2 border-gray-800">
                    หัวข้อ
                  </th>
                  <th className="text-left p-2 border-b-2 border-gray-800">
                    รายระเอียดคำร้อง
                  </th>
                  <th className="text-left p-2 border-b-2 border-gray-800">
                    เบอร์ติดต่อ
                  </th>
                  <th className="text-left p-2 border-b-2 border-gray-800">
                    รับงาน / แก้ไขสถานะโดย
                  </th>
                  <th className="text-left p-2 border-b-2 border-gray-800">
                    สร้าง ณ วันที่
                  </th>
                  <th className="text-left p-2 border-b-2 border-gray-800">
                    ตัวเลือก
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const canDelete = t.status === "OPEN" ? true : false;
                  return (
                    <tr key={t.id}>
                      <td className="p-2 border-b border-gray-300">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        {String(t.id).padStart(7, "0")}
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        {t.title}
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        {t.detail}
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        {t.tel ?? "-"}
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        {t.assignedTo?.name ?? "-"}
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="p-2 border-b border-gray-300">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/user/ticket/${t.id}`)}
                            className="px-2.5 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-xs cursor-pointer"
                          >
                            Info
                          </button>

                          <button
                            type="button"
                            onClick={
                              canDelete ? () => handleDelete(t.id) : undefined
                            }
                            disabled={!canDelete}
                            className={`px-2.5 py-1 rounded-full border-none text-xs ${
                              canDelete
                                ? "bg-red-500 text-white hover:bg-red-600 cursor-pointer"
                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                            title={
                              canDelete
                                ? "ลบคำร้อง"
                                : "ไม่สามารถลบได้เมื่อคำร้องกำลังดำเนินการหรือปิดแล้ว หรือมีเจ้าหน้าที่รับงานแล้ว"
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

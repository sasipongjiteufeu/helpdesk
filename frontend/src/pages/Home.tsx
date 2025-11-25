// src/pages/User.tsx
import { useEffect, useState } from "react";
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
  const { user } = useRequireAuth();
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
    // Auto refresh every 5 minutes (300000 milliseconds)
    const intervalId = setInterval(() => {
      loadTickets();
    }, 300000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  function StatusBadge({ status }: { status: TicketStatus }) {
    const baseClasses =
      "px-2.5 py-1 rounded-full font-semibold text-xs inline-block";

    switch (status) {
      case "OPEN":
        return (
          <span className={`${baseClasses} bg-yellow-400 text-white`}>
            {/* {status}  */}
            เปิด
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className={`${baseClasses} bg-blue-500 text-white`}>
            {/* {status}  */}
            กำลังดำเนินการ
          </span>
        );
      case "RESOLVED":
        return (
          <span className={`${baseClasses} bg-green-500 text-white`}>
            {/* {status}  */}
            แก้ไขแล้ว
          </span>
        );
      default:
        return <span className={baseClasses}>{status}</span>;
    }
  }

  {
    /* Loading State */
  }
  {
    loading && (
      <div className="mb-6 text-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-full container mx-auto bg-white rounded-2xl shadow-2xl p-5">
        {/* Header */}

        <AppHeaderBackend user={user} title="Pubilc" />

        {/* Section Title */}
        <div className="mt-4 flex  flex-col-reverse md:flex-row justify-between">
          <h2 className="text-2xl font-semibold m-0">รายการแจ้งปัญหา</h2>
        </div>

        {/* Error */}
        {error && <p className="text-red-500 mt-2">{error}</p>}

        {/* Ticket Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 border-b-2 text-xl  border-gray-800">
                  สถานะคำร้อง
                </th>
                <th className="text-left p-2 border-b-2 text-xl border-gray-800">
                  Ticket ID
                </th>
                <th className="text-left p-2 border-b-2 text-xl border-gray-800">
                  หัวข้อ
                </th>
                <th className="text-left p-2 border-b-2 text-xl border-gray-800">
                  รายระเอียดคำร้อง
                </th>
                <th className="text-left p-2 border-b-2 text-xl border-gray-800">
                  รับงาน / แก้ไขสถานะโดย
                </th>

                <th className="text-left p-2 border-b-2 text-xl border-gray-800">
                  สร้าง ณ วันที่
                </th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                return (
                  <tr key={t.id}>
                    <td className="p-2 border-b border-gray-300 text-lg">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className="p-2 border-b border-gray-300 text-lg">
                      {String(t.id).padStart(7, "0")}
                    </td>
                    <td className="p-2 border-b border-gray-300 text-lg">
                      {t.title}
                    </td>
                    <td className="p-2 border-b border-gray-300 text-lg">
                      {t.detail}
                    </td>
                    <td className="p-2 border-b border-gray-300 text-lg">
                      {t.assignedTo?.name ?? "-"}
                    </td>

                    <td className="p-2 border-b border-gray-300 text-lg">
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

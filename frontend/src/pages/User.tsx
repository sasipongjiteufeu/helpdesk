// src/pages/User.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";

import AppHeaderBackend from "../components/AppHeaderBackend";
import { MdDelete, MdOutlineAddCircle } from "react-icons/md";
import Swal from "sweetalert2";
import { FaCircleInfo } from "react-icons/fa6";

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
    // Auto refresh every 5 minutes (300000 milliseconds)
    const intervalId = setInterval(() => {
      loadTickets();
    }, 300000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  if (authLoading || !user) {
    return <div className="p-10">Checking your access…</div>;
  }

  async function handleDelete(id: number) {
    // if (!confirm("ต้องการลบคำร้องนี้หรือไม่?")) return;
    try {
      const result = await Swal.fire({
        title: "คุรแน่ใจใช่ไหม?",
        text: "คุณจะลบข้อมูล! รหัส " + id + " นี้",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "ใช่!",
        cancelButtonText: "ยกเลิก!",
      });

      if (result.isConfirmed) {
        const res = await fetch(`${API_BASE}/tickets/${id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!res.ok) {
          alert(`ไม่สามารถลบคำร้องได้ (status code ${res.status})`);
          return;
        }
        setTickets((prev) => prev.filter((t) => t.id !== id));

        await Swal.fire({
          title: "ลบ!",
          text: "ลบข้อมูลสำเร็จ",
          icon: "success",
          showConfirmButton: false,
          timer: 1500,
        });
      }
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

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-full container mx-auto bg-white rounded-2xl shadow-2xl p-5">
        {/* Header */}

        <AppHeaderBackend user={user} title={"USER"} />

        {/* Section Title */}
        <div className="mt-4 flex  flex-col-reverse md:flex-row justify-between">
          <h2 className="text-2xl font-semibold m-0">
            รายการแจ้งปัญหา{" "}
            <span className="mr-1">
              จำนวน ticket ที่กำลังดำเนินการของวันนี้
            </span>
            <span>
              <span className="text-blue-500">
                {
                  tickets.filter(
                    (t) =>
                      t.status === "IN_PROGRESS" &&
                      new Date(t.createdAt).toDateString() ===
                        new Date().toDateString()
                  ).length
                }
              </span>

              <span className="ml-1">ticket</span>
            </span>
          </h2>
          <Link
            to={"/user/create"}
            // onClick={() => navigate("/user/create")}
            className="px-4 py-1.5 mb-4  bg-green-500 hover:bg-green-600 text-white rounded-full font-semibold border-none cursor-pointer inline-flex items-center"
          >
            <MdOutlineAddCircle className="mr-1" /> <span>เพิ่ม</span>
          </Link>
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
                    เบอร์ติดต่อ
                  </th>
                  <th className="text-left p-2 border-b-2 text-xl border-gray-800">
                    รับงาน / แก้ไขสถานะโดย
                  </th>
                  <th className="text-left p-2 border-b-2 text-xl border-gray-800">
                    สร้าง ณ วันที่
                  </th>
                  <th className="text-left p-2 border-b-2 text-xl border-gray-800">
                    ตัวเลือก
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const canDelete = t.status === "OPEN" ? true : false;
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
                        {t.tel ?? "-"}
                      </td>
                      <td className="p-2 border-b border-gray-300 text-lg">
                        {t.assignedTo?.name ?? "-"}
                      </td>
                      <td className="p-2 border-b border-gray-300 text-lg">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                      <td className="p-2 border-b border-gray-300 ">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/user/ticket/${t.id}`)}
                            className="px-2.5 py-1 rounded-full border border-gray-300 bg-white hover:bg-gray-50 text-xs cursor-pointer inline-flex items-center text-center"
                          >
                            <FaCircleInfo className="mr-1 text-lg" />{" "}
                            <span className="text-lg">รายละเอียด</span>
                          </button>

                          <button
                            type="button"
                            onClick={
                              canDelete ? () => handleDelete(t.id) : undefined
                            }
                            disabled={!canDelete}
                            className={`px-2.5 py-1 rounded-full border-none  inline-flex items-center text-center text-lg ${
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
                            <MdDelete className="mr-1 text-lg" /> ลบ
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

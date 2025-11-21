// src/pages/AdminAssignRolesPage.tsx
import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useNavigate } from "react-router-dom";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { MdArrowBack } from "react-icons/md";

type RoleName = "USER" | "AGENT" | "ADMIN";

interface AdminUserRow {
  id: string;
  email: string;
  roles: RoleName[];
  ticketCount: number;
}

export default function AdminAssignRolesPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const nav = useNavigate();

  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/admin/users`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to load users (${res.status})`);
        const data = (await res.json()) as AdminUserRow[];
        setRows(data);
      } catch (e: any) {
        console.error(e);
        setError(e.message ?? "โหลดรายชื่อผู้ใช้ไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (authLoading || !user) {
    return <div className="p-10">Checking your access…</div>;
  }

  async function saveRoles(userId: string, roles: RoleName[]) {
    try {
      setSavingUserId(userId);
      const res = await fetch(`${API_BASE}/admin/users/${userId}/roles`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles }),
      });
      if (!res.ok) throw new Error(`ไม่สามารถบันทึกสิทธิ์ได้ (${res.status})`);
      const updated = await res.json();
      setRows((prev) =>
        prev.map((r) =>
          r.id === userId ? { ...r, roles: updated.roles as RoleName[] } : r
        )
      );
    } catch (e: any) {
      alert(e.message ?? "บันทึกสิทธิ์ไม่สำเร็จ");
    } finally {
      setSavingUserId(null);
    }
  }

  function toggleRole(row: AdminUserRow, role: RoleName) {
    const has = row.roles.includes(role);
    const nextRoles = has
      ? row.roles.filter((r) => r !== role)
      : [...row.roles, role];

    // simple optimistic UI
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, roles: nextRoles } : r))
    );
    void saveRoles(row.id, nextRoles);
  }

  const filteredRows = rows.filter((r) =>
    r.email.toLowerCase().includes(searchEmail.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6 box-border font-sans">
      <div className="container mx-auto bg-white rounded-2xl shadow-2xl p-5">
        <AppHeaderBackend user={user} title={"ADMIN"} />

        <div className="mt-4">
          <div className="flex flex-col md:flex-row justify-between gap-3 items-center flex-wrap">
            <h2 className="m-0">มอบหมายสิทธิ์การเข้าถึง</h2>

            <input
              type="text"
              placeholder="ค้นหา Email"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              className="py-1.5 px-2.5 rounded-full border border-gray-300 text-sm min-w-[240px]"
            />
          </div>

          {error && <p className="text-red-500 mt-2">{error}</p>}

          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 overflow-x-auto">
            {loading ? (
              <p>กำลังโหลด...</p>
            ) : filteredRows.length === 0 ? (
              <p>ไม่พบผู้ใช้</p>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="text-left p-2 border-b border-gray-300 whitespace-nowrap">
                      อีเมล
                    </th>
                    <th className="text-left p-2 border-b border-gray-300 whitespace-nowrap">
                      จำนวนคำร้อง
                    </th>
                    <th className="text-center p-2 border-b border-gray-300 whitespace-nowrap">
                      ผูใช้งานทั่วไป
                    </th>
                    <th className="text-center p-2 border-b border-gray-300 whitespace-nowrap">
                      ตัวแทน (ผู้พัฒนา)
                    </th>
                    <th className="text-center p-2 border-b border-gray-300 whitespace-nowrap">
                      ผู้ดูแลระบบ
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr key={r.id} className="border-t border-gray-200">
                      <td className="py-1.5 px-2">{r.email}</td>
                      <td className="py-1.5 px-2">{r.ticketCount}</td>
                      {(["USER", "AGENT", "ADMIN"] as RoleName[]).map(
                        (role) => (
                          <td key={role} className="py-1.5 px-2 text-center">
                            <input
                              type="checkbox"
                              checked={r.roles.includes(role)}
                              disabled={savingUserId === r.id}
                              onChange={() => toggleRole(r, role)}
                              className="cursor-pointer"
                            />
                          </td>
                        )
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <button
            type="button"
            onClick={() => nav("/admin")}
            className="mt-4 py-1.5 px-4 rounded-full border border-gray-300 bg-white cursor-pointer hover:bg-gray-50 transition-colors inline-flex items-center text-center"
          >
            <MdArrowBack className="mr-1" /> กลับหน้าหลัก ADMIN
          </button>
        </div>
      </div>
    </div>
  );
}

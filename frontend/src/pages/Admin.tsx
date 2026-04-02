// src/pages/AdminPage.tsx
import { useNavigate } from "react-router-dom";
import { useRequireAuth } from "../hooks/useRequireAuth";
import AppHeaderBackend from "../components/AppHeaderBackend";
import { FaExternalLinkAlt } from "react-icons/fa";

export default function AdminPage() {
  const { user, loading } = useRequireAuth();
  const nav = useNavigate();

  if (loading || !user) {
    return <div className="p-10">Checking your access…</div>;
  }

  return (
    <div className="min-h-screen flex flex-col justify-stretch items-center bg-gray-100 p-6 box-border font-sans">
      <div className="container  mx-auto bg-white rounded-2xl shadow-2xl p-5">
        <AppHeaderBackend user={user} title={"ADMIN"} />

        <div className="mt-4">
          <h2 className="mt-0 text-center md:text-start font-bold">
            เมนูผู้ดูแลระบบ
          </h2>

          <div className="mt-5 grid  grid-cols-1  md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-gray-200 p-[18px] bg-gray-50 hover:bg-gray-200 flex flex-col justify-between">
              <div>
                <h3 className="mt-0 mb-1">มอบหมายสิทธิ์การเข้าถึง</h3>
                <p className="m-0 text-sm text-gray-600">
                  ดูรายชื่อผู้ใช้ทั้งหมด จำนวนคำร้องของแต่ละคน และกำหนดสิทธิ์
                  USER / AGENT / ADMIN
                </p>
              </div>
              <button
                className="mt-3 py-2.5 px-4 rounded-full border-none bg-green-500 text-white font-semibold cursor-pointer hover:bg-green-600 transition-colors inline-flex justify-center items-center text-center"
                onClick={() => nav("/admin/roles")}
              >
                เปิดหน้ามอบหมายสิทธิ์ <FaExternalLinkAlt className="ml-3" />
              </button>
            </div>

            <div className="rounded-2xl border border-gray-200 p-[18px] bg-gray-50 hover:bg-gray-200 flex flex-col justify-between">
              <div>
                <h3 className="mt-0 mb-1">แสดงผล</h3>
                <p className="m-0 text-sm text-gray-600">
                  ดูสถิติคำร้องเป็นกราฟ แยกตามเดือนและสถานะ OPEN / IN_PROGRESS /
                  RESOLVED
                </p>
              </div>
              <button
                className="mt-3 py-2.5 px-4 rounded-full border-none bg-green-500 text-white font-semibold cursor-pointer hover:bg-green-600 transition-colors inline-flex justify-center items-center text-center"
                onClick={() => nav("/admin/stats")}
              >
                เปิดหน้าแสดงผล <FaExternalLinkAlt className="ml-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

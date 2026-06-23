import axios from "axios";
import { useNavigate } from "react-router-dom";
import { MdOutlineLogout } from "react-icons/md";
import Swal from "sweetalert2";
import logoSRU from "../assets/logo-sru-png.png";
import { API_BASE } from "../lib/api";

interface User {
  email?: string;
}

interface AppHeaderBackendProps {
  user: User | null;
  title?: string;
}

export default function AppHeaderBackend({ user, title }: AppHeaderBackendProps) {
  const navigate = useNavigate();

  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  const logout = async () => {
    try {
      const result = await Swal.fire({
        title: "ยืนยันการออกจากระบบ",
        text: "คุณต้องการออกจากระบบใช่ไหม?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#2563eb",
        cancelButtonColor: "#64748b",
        confirmButtonText: "ออกจากระบบ",
        cancelButtonText: "ยกเลิก",
      });

      if (!result.isConfirmed) return;

      await axios.get(`${API_BASE}/auth/logout`, { withCredentials: true });
      await Swal.fire({
        title: "ออกจากระบบแล้ว",
        text: "คุณออกจากระบบสำเร็จ",
        icon: "success",
        confirmButtonText: "ตกลง",
      });
      navigate("/");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <header className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <img src={logoSRU} alt="SRU Logo" className="h-12 w-auto shrink-0" />
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-blue-600">
              Helpdesk {title ? `• ${title}` : ""}
            </p>
            <h1 className="m-0 truncate text-lg font-bold text-slate-950 md:text-xl">
              ระบบรับเรื่องและแก้ไขปัญหาไอที
            </h1>
            <p className="m-0 text-xs text-slate-500">
              มหาวิทยาลัยราชภัฏสุราษฎร์ธานี
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {user ? (
            <>
              <span className="truncate rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
                {user.email}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <MdOutlineLogout /> ออกจากระบบ
              </button>
            </>
          ) : (
            <button
              onClick={handleLogin}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
            >
              เข้าสู่ระบบด้วยอีเมลมหาวิทยาลัย
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

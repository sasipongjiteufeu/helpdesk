import axios from "axios";
import { API_BASE } from "../lib/api";
import { useNavigate } from "react-router-dom";
import logoSRU from "../assets/logo-sru-png.png";
import Swal from "sweetalert2";

interface User {
  email: string;
  // Add other user properties as needed
}

interface AppHeaderBackendProps {
  user: User | null;
  title?: string; // Add this line
}

export default function AppHeaderBackend({
  user,
  title,
}: AppHeaderBackendProps) {
  const navigate = useNavigate();

  const logout = async () => {
    try {
      const result = await Swal.fire({
        title: "แน่ใจใช่ไหม?",
        text: "ว่าคุณจะออกจากระบบ!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "ใช่!",
        cancelButtonText: "ไม่ใช่!",
      });
      if (result.isConfirmed) {
        Swal.fire({
          title: "ออกจากระบบ!",
          text: "คุณออกจากระบบสำเร็จ.",
          icon: "success",
          confirmButtonText: "ตกลง",
        });
        const response = await axios.get(`${API_BASE}/auth/logout`, {
          withCredentials: true,
        });
        console.log(response);
        navigate("/");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 pb-3">
      <div className="flex items-center gap-3">
        <img src={logoSRU} alt="SRU Logo" className="h-14 w-auto" />
        <span className="text-3xl font-bold">HelpDesk {title}</span>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <span>{user?.email}</span>
        <button
          onClick={logout}
          className="px-3.5 py-1.5 rounded-full border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

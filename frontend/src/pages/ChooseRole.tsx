// src/pages/ChooseRole.tsx

import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";
import logoSRU from "../assets/logo-sru-png.png";
import CCI from "../assets/CCI.png";
import { FaUser } from "react-icons/fa6";
import { RiAdminFill } from "react-icons/ri";
import { MdDeveloperMode } from "react-icons/md";

import "animate.css";

type RoleName = "USER" | "AGENT" | "ADMIN";

interface MeResponse {
  email?: string;
  roles?: { name?: RoleName }[];
}

export default function ChooseRole() {
  const [roles, setRoles] = useState<RoleName[]>([]);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          credentials: "include",
        });
        const data: MeResponse = await res.json();

        const order: Record<RoleName, number> = {
          USER: 0,
          AGENT: 1,
          ADMIN: 2,
        };

        const names = (data?.roles || [])
          .map((role) => role?.name)
          .filter((n): n is RoleName => Boolean(n))
          .sort((a, b) => order[a] - order[b]);

        setEmail(data?.email || "");

        // ถ้าผู้ใช้มีแค่ 1 role → ข้ามไปเลย
        if (names.length === 1) {
          const map: Record<RoleName, string> = {
            ADMIN: "/admin",
            AGENT: "/agent",
            USER: "/user",
          };
          window.location.replace(map[names[0]]);
          return;
        }

        setRoles(names);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const go = (role: RoleName) => {
    const map: Record<RoleName, string> = {
      ADMIN: "/admin",
      AGENT: "/agent",
      USER: "/user",
    };
    window.location.replace(map[role]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="w-full max-w-[480px] bg-white/95 backdrop-blur-sm rounded-2xl px-8 pt-8 pb-6 shadow-[0_20px_45px_rgba(79,70,229,0.15)] text-center relative z-10">
        {/* โลโก้ ARIT + SRU */}
        <div className="flex items-center justify-center gap-6 mb-6 animate__animated animate__fadeInUp">
          <img
            src={logoSRU}
            alt="Suratthani Rajabhat University Logo"
            className="h-[110px] object-contain"
          />
          <img
            src={CCI}
            alt="CCI Logo"
            className="h-[70px] object-contain"
          />
        </div>

        <div className="mb-8 animate__animated animate__fadeInUp">
          <p className="text-3xl font-bold text-gray-800 mb-2">Welcome!</p>
          {email && (
            <p className="text-indigo-600 font-medium text-lg mb-2">{email}</p>
          )}
          <p className="text-gray-600 text-sm">
            กรุณาเลือกรูปแบบการเข้าใช้งานระบบ
          </p>
        </div>

        <div>
          {loading && (
            <p className="text-gray-500 text-sm py-8 animate__animated animate__fadeInUp">
              กำลังโหลดสิทธิ์การใช้งาน…
            </p>
          )}

          <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto animate__animated animate__fadeInUp">
            {!loading &&
              roles.map((role) => (
                <button
                  key={role}
                  onClick={() => go(role)}
                  className={`
    inline-flex w-full items-center justify-center gap-3
    rounded-lg px-6 py-3 text-base font-semibold leading-tight
    text-white shadow-lg whitespace-normal
    focus:outline-none focus:ring-4
    transition-all duration-300 transform
    hover:scale-105 hover:shadow-xl active:scale-95

    ${role === "ADMIN"
                      ? `
          bg-rose-600                    /* ✅ solid color for mobile */
          md:bg-gradient-to-r            /* gradients only on md+ */
          md:from-rose-500 md:via-rose-600 md:to-pink-600
          md:hover:from-rose-600 md:hover:via-rose-700 md:hover:to-pink-700
          focus:ring-rose-300
        `
                      : role === "AGENT"
                        ? `
          bg-blue-600
          md:bg-gradient-to-r
          md:from-blue-500 md:via-blue-600 md:to-indigo-600
          md:hover:from-blue-600 md:hover:via-blue-700 md:hover:to-indigo-700
          focus:ring-blue-300
        `
                        : `
          bg-emerald-600
          md:bg-gradient-to-r
          md:from-emerald-500 md:via-emerald-600 md:to-teal-600
          md:hover:from-emerald-600 md:hover:via-emerald-700 md:hover:to-teal-700
          focus:ring-emerald-300
        `
                    }
  `}
                >
                  {role === "ADMIN" ? (
                    <RiAdminFill />
                  ) : role === "AGENT" ? (
                    <MdDeveloperMode />
                  ) : (
                    <FaUser />
                  )}

                  {role === "ADMIN"
                    ? "ผู้ดูแลระบบ"
                    : role === "AGENT"
                    ? "เจ้าหน้าที่ศูนย์คอม"
                    : "ผู้ใช้งานทั่วไป"}

                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

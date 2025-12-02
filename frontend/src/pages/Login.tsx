// src/pages/Login.tsx
import "animate.css";
import logoArit from '../assets/logo-ARIT.png';
import logoSru from '../assets/logo-sru-png.png';


const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

export default function Login() {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[480px] bg-white rounded-2xl px-8 pt-8 pb-6 shadow-[0_20px_45px_rgba(15,23,42,0.12)] text-center">
        {/* โลโก้ ARIT + SRU */}
        <div className="flex items-center justify-center gap-6 mb-5">
          <img
            src={logoArit}
            alt="ARIT Logo"
            className="h-[70px] object-contain animate__animated animate__fadeInUp animate__fast"
          />
          <img
            src={logoSru}
            alt="Suratthani Rajabhat University Logo"
            className="h-[110px] object-contain animate__animated animate__fadeInUp animate__fast"
          />
        </div>

        {/* ข้อความชื่อระบบ */}
        <div className="animate__animated animate__fadeInUp">
          <h1 className="text-2xl m-0 mb-1 text-gray-900">
            ระบบบริการ Helpdesk
          </h1>
          <p className="m-0 text-sm text-gray-600">
            สำนักงานวิทยบริการและเทคโนโลยีสารสนเทศ
          </p>
          <p className="m-0 text-sm text-gray-600">
            มหาวิทยาลัยราชภัฏสุราษฎร์ธานี
          </p>
        </div>

        {/* ปุ่ม Google */}
        <button
          type="button"
          onClick={handleLogin}
          className="mt-6 w-full h-12 rounded-full border border-gray-300 bg-white inline-flex items-center justify-center gap-2.5 text-[0.95rem] font-medium text-gray-700 cursor-pointer transition-all duration-150 ease-in-out hover:border-gray-400 hover:shadow-[0_8px_20px_rgba(0,0,0,0.08)] hover:-translate-y-px hover:bg-gray-50 animate__animated animate__fadeInUp"
        >
          <span className="w-[22px] h-[22px] rounded-full border border-gray-300 inline-flex items-center justify-center font-bold text-sm">
            G
          </span>
          <span>เข้าสู่ระบบด้วยบัญชี Google (@sru.ac.th)</span>
        </button>

        {/* Note */}
        <p className="mt-3 text-xs text-gray-500 animate__animated animate__fadeInUp animate__delay-1s">
          * ระบบนี้รองรับเฉพาะบัญชี Google ของมหาวิทยาลัย (@sru.ac.th)
        </p>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 10px) scale(1.05); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}

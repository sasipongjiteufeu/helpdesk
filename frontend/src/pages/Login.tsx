// src/pages/Login.tsx

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export default function Login() {
  const handleLogin = () => {
    window.location.href = `${API_BASE}/auth/google`;
  };

  // --- inline styles แยกเฉพาะหน้านี้ ---
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background:
      'radial-gradient(circle at top, #e3f2fd 0, #f3f4f6 45%, #eef2ff 100%)',
  };

  const cardStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '480px',
    background: '#ffffff',
    borderRadius: '16px',
    padding: '32px 32px 24px',
    boxShadow: '0 20px 45px rgba(15, 23, 42, 0.12)',
    textAlign: 'center',
  };

  const logosRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '24px',
    marginBottom: '20px',
  };

  const aritLogoStyle: React.CSSProperties = {
    height: '70px',
    objectFit: 'contain',
  };

  const sruLogoStyle: React.CSSProperties = {
    height: '110px', // ทำให้ตรามอใหญ่ขึ้นหน่อย
    objectFit: 'contain',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '1.4rem',
    margin: '0 0 4px',
    color: '#111827',
  };

  const textStyle: React.CSSProperties = {
    margin: 0,
    fontSize: '0.9rem',
    color: '#4b5563',
  };

  const googleBtnStyle: React.CSSProperties = {
    marginTop: '24px',
    width: '100%',
    height: '48px',
    borderRadius: '999px',
    border: '1px solid #d1d5db',
    backgroundColor: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    fontSize: '0.95rem',
    fontWeight: 500,
    color: '#374151',
    cursor: 'pointer',
    transition:
      'box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease, background-color 150ms ease',
  };

  const googleIconStyle: React.CSSProperties = {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    border: '1px solid #d1d5db',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
  };

  const noteStyle: React.CSSProperties = {
    marginTop: '12px',
    fontSize: '0.75rem',
    color: '#6b7280',
  };

  // --- hover effect ด้วย onMouseEnter/Leave แทน CSS ---
  const onMouseEnterBtn = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.currentTarget.style.borderColor = '#9ca3af';
    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
    e.currentTarget.style.transform = 'translateY(-1px)';
    e.currentTarget.style.backgroundColor = '#f9fafb';
  };

  const onMouseLeaveBtn = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  ) => {
    e.currentTarget.style.borderColor = '#d1d5db';
    e.currentTarget.style.boxShadow = 'none';
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.backgroundColor = '#ffffff';
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        {/* โลโก้ ARIT + SRU */}
        <div style={logosRowStyle}>
          <img src="/logo-ARIT.png" alt="ARIT Logo" style={aritLogoStyle} />
          <img
            src="/logo-sru-png.png"
            alt="Suratthani Rajabhat University Logo"
            style={sruLogoStyle}
          />
        </div>

        {/* ข้อความชื่อระบบ */}
        <div>
          <h1 style={titleStyle}>ระบบบริการ Helpdesk</h1>
          <p style={textStyle}>สำนักงานวิทยบริการและเทคโนโลยีสารสนเทศ</p>
          <p style={textStyle}>มหาวิทยาลัยราชภัฏสุราษฎร์ธานี</p>
        </div>

        {/* ปุ่ม Google */}
        <button
          type="button"
          style={googleBtnStyle}
          onClick={handleLogin}
          onMouseEnter={onMouseEnterBtn}
          onMouseLeave={onMouseLeaveBtn}
        >
          <span style={googleIconStyle}>G</span>
          <span>เข้าสู่ระบบด้วยบัญชี Google (@sru.ac.th)</span>
        </button>

        {/* Note */}
        <p style={noteStyle}>
          * ระบบนี้รองรับเฉพาะบัญชี Google ของมหาวิทยาลัย (@sru.ac.th)
        </p>
      </div>
    </div>
  );
}

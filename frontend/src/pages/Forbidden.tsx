import { Link } from "react-router-dom";
export default function Forbidden() {
  const params = new URLSearchParams(location.search);
  const reason = params.get('reason');
  const msg =
    reason === 'unauthorized'
      ? 'กรุณาใช้บัญชีอีเมลมหาวิทยาลัยที่มีสิทธิ์เข้าใช้งาน'
      : 'บัญชีของคุณไม่มีสิทธิ์เข้าถึงหน้านี้';
  return (
    <div className="utility-page">
      <div className="utility-card">
        <p>SRU HELPDESK · ACCESS DENIED</p>
        <h1>ไม่สามารถเข้าถึงหน้านี้ได้</h1>
        <p>{msg}</p>
        <Link to="/">กลับหน้าภาพรวมระบบ</Link>
      </div>
    </div>
  );
}

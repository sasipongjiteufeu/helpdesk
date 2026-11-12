import { Link } from "react-router-dom";
export default function Welcome() {
  return (
    <div className="utility-page">
      <div className="utility-card"><p>SRU HELPDESK</p><h1>ยินดีต้อนรับสู่ศูนย์บริการ IT</h1><p>แจ้งปัญหาและติดตามสถานะการดำเนินงานของคุณ</p><Link to="/">เข้าสู่พื้นที่การทำงาน</Link></div>
    </div>
  );
}

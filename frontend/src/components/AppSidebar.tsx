import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MdDashboard, MdAddCircleOutline, MdConfirmationNumber, MdAdminPanelSettings, MdBarChart, MdPeopleOutline, MdMenu, MdClose } from "react-icons/md";
import logo from "../assets/logo-sru-png.png";

interface Props { user: { email?: string; roles?: { name?: string }[] } | null }

export default function AppSidebar({ user }: Props) {
  const [openedPath, setOpenedPath] = useState<string | null>(null);
  const { pathname } = useLocation();
  const open = openedPath === pathname;
  const roles = user?.roles?.map(role => role.name) ?? [];
  const links = [
    { to: "/", label: "ภาพรวมระบบ", icon: MdDashboard, end: true },
    ...(roles.includes("USER") ? [
      { to: "/user", label: "Ticket ของฉัน", icon: MdConfirmationNumber, end: true },
      { to: "/user/create", label: "แจ้งปัญหาใหม่", icon: MdAddCircleOutline, end: true },
    ] : []),
    ...(roles.includes("AGENT") ? [{ to: "/agent", label: "งานบริการ IT", icon: MdConfirmationNumber, end: false }] : []),
    ...(roles.includes("ADMIN") ? [
      { to: "/admin", label: "ผู้ดูแลระบบ", icon: MdAdminPanelSettings, end: true },
      { to: "/admin/roles", label: "จัดการสิทธิ์ผู้ใช้งาน", icon: MdPeopleOutline, end: true },
      { to: "/admin/stats", label: "รายงานและสถิติ", icon: MdBarChart, end: true },
    ] : []),
    ...(!user ? [{ to: "/login", label: "เข้าสู่ระบบ / แจ้งปัญหา", icon: MdAddCircleOutline, end: true }] : []),
  ];
  return (
    <>
      <div className="mobile-navigation">
        <span>SRU <strong>HELPDESK</strong></span>
        <button type="button" onClick={() => setOpenedPath(open ? null : pathname)} aria-expanded={open} aria-controls="app-navigation" aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}>{open ? <MdClose /> : <MdMenu />}</button>
      </div>
      <aside className={`app-sidebar ${open ? "is-open" : ""}`}>
        <NavLink to="/" className="sidebar-brand" onClick={() => setOpenedPath(null)}>
          <img src={logo} alt="ตรามหาวิทยาลัยราชภัฏสุราษฎร์ธานี" />
          <div><strong>SRU HELPDESK</strong><span>ศูนย์บริการด้านเทคโนโลยีสารสนเทศ</span></div>
        </NavLink>
        <p className="sidebar-caption">พื้นที่การทำงาน</p>
        <nav id="app-navigation" aria-label="เมนูหลัก">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpenedPath(null)} className={({ isActive }) => `sidebar-link ${isActive || (to === "/user" && pathname.startsWith("/user/ticket/")) ? "is-active" : ""}`}><Icon aria-hidden="true" /><span>{label}</span></NavLink>
          ))}
        </nav>
        <div className="sidebar-help"><span>IT SUPPORT</span><strong>แจ้งปัญหา ติดตามงาน<br />ครบในที่เดียว</strong><p>มหาวิทยาลัยราชภัฏสุราษฎร์ธานี</p></div>
      </aside>
    </>
  );
}

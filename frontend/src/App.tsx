import { Routes, Route } from 'react-router-dom';

import Login from './pages/Login';
import AgentTicketInfoPage from './pages/AgentTicketInfoPage';
import Welcome from './pages/Welcome';
import Forbidden from './pages/Forbidden';
import AgentTicketsPage from './pages/AgentTicketPage';

import User from './pages/User';
import ChooseRole from './pages/ChooseRole';
import UserCreateTicketPage from './pages/UserCreateTicketPage';
import UserTicketInfoPage from './pages/UserTicketInfoPage';
import AdminPage from './pages/Admin';
import AdminAssignRolesPage from './pages/AdminAssignRolesPage';
import AdminStatsPage from './pages/AdminStatsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/forbidden" element={<Forbidden />} />

      {/* role pages */}
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/admin/roles" element={<AdminAssignRolesPage />} />
      <Route path="/admin/stats" element={<AdminStatsPage />} />
      <Route path="/user" element={<User />} />
      <Route path="/user/create" element={<UserCreateTicketPage />} />
      <Route path="/user/ticket/:id" element={<UserTicketInfoPage />} />
      <Route path="/agent" element={<AgentTicketsPage />} />
      <Route path="/agent/ticket/:id" element={<AgentTicketInfoPage />} />
      {/* multi-role choose page */}
      <Route path="/choose-role" element={<ChooseRole />} />
    </Routes>
  );
}

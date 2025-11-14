import { Routes, Route } from 'react-router-dom';

import Login from './pages/Login';

import Welcome from './pages/Welcome';
import Forbidden from './pages/Forbidden';

import Admin from './pages/Admin';
import Agent from './pages/Agent';
import User from './pages/User';
import ChooseRole from './pages/ChooseRole';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/forbidden" element={<Forbidden />} />

      {/* role pages */}
      <Route path="/admin" element={<Admin />} />
      <Route path="/agent" element={<Agent />} />
      <Route path="/user" element={<User />} />
      

      {/* multi-role choose page */}
      <Route path="/choose-role" element={<ChooseRole />} />
    </Routes>
  );
}

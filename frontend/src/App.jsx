import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import Matches from './pages/Matches';
import Profile from './pages/Profile';
import AdminUsers from './pages/AdminUsers';
import Ranking from './pages/Ranking';
import Navbar from './components/Navbar';

const PrivateRoute = ({ children }) =>
  localStorage.getItem('token') ? children : <Navigate to="/login" />;

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div style={{ minHeight: 'calc(100vh - 56px)', background: '#f5f7fa' }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/tournaments" element={<PrivateRoute><Tournaments /></PrivateRoute>} />
          <Route path="/tournaments/:id" element={<PrivateRoute><TournamentDetail /></PrivateRoute>} />
          <Route path="/tournaments/:id/matches" element={<PrivateRoute><Matches /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/ranking" element={<PrivateRoute><Ranking /></PrivateRoute>} />
          <Route path="/admin/users" element={<PrivateRoute><AdminUsers /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/tournaments" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

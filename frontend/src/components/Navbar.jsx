import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const logout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <nav style={{ display: 'flex', gap: 16, padding: 12, background: '#1a1a2e' }}>
      <Link to="/tournaments" style={{ color: '#fff' }}>Torneios</Link>
      <Link to="/profile" style={{ color: '#fff' }}>Perfil</Link>
      {localStorage.getItem('role') === 'admin' && (
        <Link to="/admin/users" style={{ color: '#fff' }}>Usuários</Link>
      )}
      {token
        ? <button onClick={logout} style={{ marginLeft: 'auto' }}>Sair</button>
        : <Link to="/login" style={{ color: '#fff', marginLeft: 'auto' }}>Login</Link>
      }
    </nav>
  );
}

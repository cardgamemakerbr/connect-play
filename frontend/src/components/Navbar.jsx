import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef();

  const loadNotifications = () => {
    if (token) api.get('/notifications').then(r => setNotifications(r.data)).catch(() => {});
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const logout = () => { localStorage.clear(); navigate('/login'); };

  const unread = notifications.filter(n => !n.read).length;

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const markRead = async (id, link) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
    setOpen(false);
    if (link) navigate(link);
  };

  const TYPE_ICON = { tournament: '🏆', match: '⚔️', result: '🎯', message: '💬' };

  return (
    <nav style={nav}>
      <Link to="/tournaments" style={logo}>🎮 Connect Play</Link>
      <div style={links}>
        <Link to="/tournaments" style={link}>🏟️ Torneios</Link>
        <Link to="/ranking" style={link}>🏆 Ranking</Link>
        <Link to="/profile" style={link}>👤 Perfil</Link>
        {role === 'admin' && <Link to="/admin/users" style={link}>⚙️ Usuários</Link>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
        {token && (
          <div ref={ref} style={{ position: 'relative' }}>
            <button onClick={() => setOpen(!open)} style={bellBtn}>
              🔔
              {unread > 0 && <span style={badge}>{unread > 9 ? '9+' : unread}</span>}
            </button>
            {open && (
              <div style={dropdown}>
                <div style={dropHeader}>
                  <strong>Notificações</strong>
                  {unread > 0 && <button onClick={markAllRead} style={markAllBtn}>Marcar todas como lidas</button>}
                </div>
                {notifications.length === 0 && <p style={emptyNote}>Nenhuma notificação 🎉</p>}
                {notifications.slice(0, 10).map(n => (
                  <div key={n._id} onClick={() => markRead(n._id, n.link)} style={{ ...noteItem, background: n.read ? '#fff' : '#f0f7ff' }}>
                    <span style={{ fontSize: 18, marginRight: 8 }}>{TYPE_ICON[n.type] || '📢'}</span>
                    <div>
                      <div style={{ fontWeight: n.read ? 400 : 700, fontSize: 14 }}>{n.title}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>{n.body}</div>
                    </div>
                    {!n.read && <span style={dot} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {token
          ? <button onClick={logout} style={logoutBtn}>🚪 Sair</button>
          : <Link to="/login" style={{ ...link, background: '#1677ff', borderRadius: 8, padding: '6px 14px' }}>Entrar</Link>
        }
      </div>
    </nav>
  );
}

const nav = { display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', height: 56, background: '#1a1a2e', boxShadow: '0 2px 8px #0003', position: 'sticky', top: 0, zIndex: 100 };
const logo = { color: '#fadb14', fontWeight: 800, fontSize: 20, textDecoration: 'none', marginRight: 16, letterSpacing: 0.5 };
const links = { display: 'flex', gap: 4 };
const link = { color: '#e0e0e0', textDecoration: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, transition: 'background 0.2s' };
const bellBtn = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, position: 'relative', color: '#fff', padding: '4px 8px' };
const badge = { position: 'absolute', top: 0, right: 0, background: '#ff4d4f', color: '#fff', borderRadius: '50%', fontSize: 10, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 };
const dropdown = { position: 'absolute', right: 0, top: 44, width: 340, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px #0002', zIndex: 200, overflow: 'hidden' };
const dropHeader = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' };
const markAllBtn = { background: 'none', border: 'none', color: '#1677ff', cursor: 'pointer', fontSize: 12 };
const noteItem = { display: 'flex', alignItems: 'flex-start', gap: 4, padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5', position: 'relative' };
const emptyNote = { padding: '20px 16px', textAlign: 'center', color: '#aaa', fontSize: 14 };
const dot = { width: 8, height: 8, background: '#1677ff', borderRadius: '50%', position: 'absolute', right: 12, top: 14 };
const logoutBtn = { background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 14, fontWeight: 600 };

import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => { api.get('/users').then(r => setUsers(r.data)); }, []);

  const changeRole = async (id, role) => {
    const { data } = await api.put(`/users/${id}/role`, { role });
    setUsers(users.map(u => u._id === id ? data : u));
  };

  const remove = async (id) => {
    await api.delete(`/users/${id}`);
    setUsers(users.filter(u => u._id !== id));
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Gerenciar Usuários</h2>
      <table>
        <thead><tr><th>Nome</th><th>Login</th><th>Papel</th><th>Ações</th></tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u._id}>
              <td>{u.name}</td>
              <td>{u.login}</td>
              <td>
                <select value={u.role} onChange={e => changeRole(u._id, e.target.value)}>
                  <option value="player">player</option>
                  <option value="organizer">organizer</option>
                  <option value="admin">admin</option>
                </select>
              </td>
              <td><button onClick={() => remove(u._id)}>Excluir</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TYPES = ['single_elimination','double_elimination','swiss','round_robin','draft','sealed','ladder'];

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'swiss', startDate: '', endDate: '', maxParticipants: '' });
  const [showForm, setShowForm] = useState(false);
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  useEffect(() => { api.get('/tournaments').then(r => setTournaments(r.data)); }, []);

  const create = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/tournaments', form);
    setTournaments([...tournaments, data]);
    setShowForm(false);
  };

  const join = async (id) => {
    await api.post(`/tournaments/${id}/join`);
    alert('Inscrição realizada!');
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Torneios</h2>
      {(role === 'admin' || role === 'organizer') && (
        <button onClick={() => setShowForm(!showForm)}>+ Novo Torneio</button>
      )}
      {showForm && (
        <form onSubmit={create} style={{ margin: '16px 0' }}>
          <input placeholder="Nome" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <input type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          <input type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          <input type="number" placeholder="Máx. participantes" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: e.target.value })} />
          <button type="submit">Criar</button>
        </form>
      )}
      <ul>
        {tournaments.map(t => (
          <li key={t._id} style={{ margin: '8px 0' }}>
            <strong>{t.name}</strong> — {t.type} — {t.status}
            <button onClick={() => navigate(`/tournaments/${t._id}`)}>Ver</button>
            {t.status === 'open' && <button onClick={() => join(t._id)}>Inscrever</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

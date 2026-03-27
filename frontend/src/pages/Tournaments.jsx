import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TYPES = ['single_elimination','double_elimination','swiss','round_robin','draft','sealed','ladder'];

const TYPE_DESCRIPTIONS = {
  single_elimination: 'Eliminação simples: o perdedor é eliminado imediatamente. O torneio avança em chaves até restar um campeão. Ideal para número de participantes em potência de 2.',
  double_elimination: 'Eliminação dupla: o jogador só é eliminado após duas derrotas. Existe chave principal e chave de perdedores.',
  swiss: 'Sistema suíço: todos jogam o mesmo número de rodadas sem eliminação. Pontuação acumulada define o ranking final. Recomendado número par de participantes.',
  round_robin: 'Todos contra todos: cada jogador enfrenta todos os outros. Vence quem acumular mais pontos ao final.',
  draft: 'Draft: antes de jogar, os participantes escolhem cartas/peças em turnos para montar seus decks/times.',
  sealed: 'Sealed: cada participante recebe recursos aleatórios e deve montar seu deck/time apenas com o que recebeu.',
  ladder: 'Ladder (escada): ranking contínuo onde qualquer jogador pode desafiar outro acima na tabela para subir de posição.',
};

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
    try {
      await api.post(`/tournaments/${id}/join`);
      alert('Inscrição realizada!');
      const { data } = await api.get('/tournaments');
      setTournaments(data);
    } catch (e) {
      alert(e.response?.data?.message || 'Erro ao se inscrever');
    }
  };

  const deleteTournament = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este torneio?')) return;
    try {
      await api.delete(`/tournaments/${id}`);
      setTournaments(tournaments.filter(t => t._id !== id));
    } catch (e) {
      alert(e.response?.data?.message || 'Erro ao deletar torneio');
    }
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
          <div style={{ background: '#f0f4ff', border: '1px solid #c0cfe8', borderRadius: 6, padding: '8px 12px', margin: '6px 0', fontSize: 13, color: '#334' }}>
            {TYPE_DESCRIPTIONS[form.type]}
          </div>
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
            {role === 'admin' && <button onClick={() => deleteTournament(t._id)} style={{ marginLeft: 8, color: 'red' }}>Deletar</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

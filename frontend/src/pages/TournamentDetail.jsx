import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const TYPE_DESCRIPTIONS = {
  single_elimination: 'Eliminação simples: o perdedor é eliminado. Vence quem ganhar todas as partidas.',
  double_elimination: 'Eliminação dupla: o jogador só é eliminado após duas derrotas.',
  swiss: 'Sistema suíço: todos jogam o mesmo número de rodadas, sem eliminação. Classificação por pontos.',
  round_robin: 'Todos contra todos: cada jogador enfrenta todos os outros pelo menos uma vez.',
  draft: 'Draft: jogadores montam seus decks/times escolhendo cartas/peças em turnos antes de jogar.',
  sealed: 'Sealed: jogadores recebem recursos aleatórios e montam seus decks/times com o que receberam.',
  ladder: 'Ladder (escada): ranking contínuo onde jogadores desafiam uns aos outros para subir de posição.',
};

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [messages, setMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [text, setText] = useState('');
  const [addUserId, setAddUserId] = useState('');
  const role = localStorage.getItem('role');
  const isManager = role === 'admin' || role === 'organizer';

  const loadTournament = () =>
    api.get('/tournaments').then(r => setTournament(r.data.find(t => t._id === id)));

  useEffect(() => {
    loadTournament();
    api.get(`/messages/tournament/${id}`).then(r => setMessages(r.data));
    if (isManager) api.get('/users').then(r => setAllUsers(r.data));
  }, [id]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/messages', { tournament: id, content: text });
    setMessages([...messages, data]);
    setText('');
  };

  const addParticipant = async () => {
    if (!addUserId) return;
    try {
      await api.post(`/tournaments/${id}/participants`, { userId: addUserId });
      setAddUserId('');
      loadTournament();
    } catch (e) {
      alert(e.response?.data?.message || 'Erro ao adicionar participante');
    }
  };

  const removeParticipant = async (userId) => {
    try {
      await api.delete(`/tournaments/${id}/participants/${userId}`);
      loadTournament();
    } catch (e) {
      alert(e.response?.data?.message || 'Erro ao remover participante');
    }
  };

  const generateMatches = async () => {
    try {
      await api.post(`/matches/generate/${id}`);
      alert('Partidas geradas com sucesso!');
      navigate(`/tournaments/${id}/matches`);
    } catch (e) {
      alert(e.response?.data?.message || 'Erro ao gerar partidas');
    }
  };

  if (!tournament) return <p>Carregando...</p>;

  const participants = tournament.participants || [];
  const nonParticipants = allUsers.filter(u => !participants.some(p => (p._id || p) === u._id));

  return (
    <div style={{ padding: 24 }}>
      <h2>{tournament.name}</h2>
      <p>Tipo: <strong>{tournament.type}</strong> | Status: {tournament.status}</p>
      <div style={{ background: '#f0f4ff', border: '1px solid #c0cfe8', borderRadius: 6, padding: '8px 12px', margin: '6px 0', fontSize: 13, color: '#334' }}>
        {TYPE_DESCRIPTIONS[tournament.type]}
      </div>

      <button onClick={() => navigate(`/tournaments/${id}/matches`)}>Ver Partidas</button>
      {isManager && tournament.status === 'open' && participants.length >= 2 && (
        <button onClick={generateMatches} style={{ marginLeft: 8 }}>Gerar Partidas</button>
      )}

      <h3>Participantes ({participants.length}{tournament.maxParticipants ? `/${tournament.maxParticipants}` : ''})</h3>
      <ul>
        {participants.map(p => (
          <li key={p._id || p}>
            {p.login || p.name || p}
            {isManager && (
              <button onClick={() => removeParticipant(p._id || p)} style={{ marginLeft: 8 }}>Remover</button>
            )}
          </li>
        ))}
      </ul>

      {isManager && (
        <div style={{ margin: '8px 0' }}>
          <select value={addUserId} onChange={e => setAddUserId(e.target.value)}>
            <option value=''>Selecionar jogador para adicionar...</option>
            {nonParticipants.map(u => (
              <option key={u._id} value={u._id}>{u.login} — {u.name}</option>
            ))}
          </select>
          <button onClick={addParticipant} disabled={!addUserId}>Adicionar</button>
        </div>
      )}

      <h3>Mensagens</h3>
      <ul>
        {messages.map(m => (
          <li key={m._id}><strong>{m.from?.login}:</strong> {m.content}</li>
        ))}
      </ul>
      <form onSubmit={sendMessage}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder='Mensagem...' required />
        <button type='submit'>Enviar</button>
      </form>
    </div>
  );
}

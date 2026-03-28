import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const TYPE_DESCRIPTIONS = {
  single_elimination: 'Eliminação simples: o perdedor é eliminado imediatamente. Avança em chaves até restar um campeão.',
  double_elimination: 'Eliminação dupla: o jogador só é eliminado após duas derrotas. Existe chave principal e chave de perdedores.',
  swiss: 'Sistema suíço: todos jogam o mesmo número de rodadas sem eliminação. Pontuação acumulada define o ranking final.',
  round_robin: 'Todos contra todos: cada jogador enfrenta todos os outros. Vence quem acumular mais pontos ao final.',
  draft: 'Draft: antes de jogar, os participantes escolhem cartas/peças em turnos para montar seus decks/times.',
  sealed: 'Sealed: cada participante recebe recursos aleatórios e deve montar seu deck/time apenas com o que recebeu.',
  ladder: 'Ladder (escada): ranking contínuo onde qualquer jogador pode desafiar outro acima na tabela para subir de posição.',
};

const TYPE_ICON = { single_elimination:'⚔️', double_elimination:'🔁', swiss:'🇨🇭', round_robin:'🔄', draft:'🃏', sealed:'📦', ladder:'🪜' };
const STATUS_COLOR = { open: '#52c41a', ongoing: '#1677ff', closed: '#ff4d4f' };
const STATUS_LABEL = { open: '🟢 Aberto', ongoing: '🔵 Em andamento', closed: '🔴 Encerrado' };
const PODIUM = ['🥇','🥈','🥉'];

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [messages, setMessages] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [scoreboard, setScoreboard] = useState(null);
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
    // Carrega scoreboard para pódio
    api.get(`/matches/tournament/${id}`).then(r => {
      if (r.data.scoreboard) setScoreboard(r.data.scoreboard);
    }).catch(() => {});
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
      setAddUserId(''); loadTournament();
    } catch (e) { alert(e.response?.data?.message || 'Erro ao adicionar participante'); }
  };

  const removeParticipant = async (userId) => {
    try {
      await api.delete(`/tournaments/${id}/participants/${userId}`);
      loadTournament();
    } catch (e) { alert(e.response?.data?.message || 'Erro ao remover participante'); }
  };

  const generateMatches = async () => {
    try {
      await api.post(`/matches/generate/${id}`);
      navigate(`/tournaments/${id}/matches`);
    } catch (e) { alert(e.response?.data?.message || 'Erro ao gerar partidas'); }
  };

  if (!tournament) return <p style={{ padding: 32, textAlign: 'center' }}>Carregando... ⏳</p>;

  const participants = tournament.participants || [];
  const nonParticipants = allUsers.filter(u => !participants.some(p => (p._id || p) === u._id));
  const isClosed = tournament.status === 'closed';
  const podiumPlayers = scoreboard?.slice(0, 3) || [];

  return (
    <div style={page}>
      {/* Header */}
      <div style={headerCard}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 48 }}>{TYPE_ICON[tournament.type] || '🎮'}</span>
          <div>
            <h2 style={titleStyle}>{tournament.name}</h2>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ ...badge, background: STATUS_COLOR[tournament.status] + '22', color: STATUS_COLOR[tournament.status] }}>
                {STATUS_LABEL[tournament.status]}
              </span>
              <span style={{ ...badge, background: '#f0f4ff', color: '#1677ff' }}>{tournament.type}</span>
              <span style={{ ...badge, background: '#f6ffed', color: '#52c41a' }}>
                👥 {participants.length}{tournament.maxParticipants ? `/${tournament.maxParticipants}` : ''} jogadores
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <button onClick={() => navigate(`/tournaments/${id}/matches`)} style={btnBlue}>⚔️ Ver Partidas</button>
          {isManager && tournament.status === 'open' && participants.length >= 2 && (
            <button onClick={generateMatches} style={btnGreen}>🚀 Gerar Partidas</button>
          )}
        </div>
      </div>

      {/* Descrição */}
      <div style={descCard}>
        <span style={{ fontSize: 18, marginRight: 8 }}>ℹ️</span>
        {TYPE_DESCRIPTIONS[tournament.type]}
      </div>

      {/* Pódio — apenas torneios encerrados com scoreboard */}
      {isClosed && podiumPlayers.length > 0 && (
        <div style={podiumSection}>
          <h3 style={sectionTitle}>🏆 Pódio Final</h3>
          <div style={podiumRow}>
            {/* Ordem visual: 2º, 1º, 3º */}
            {[1, 0, 2].map(idx => {
              const p = podiumPlayers[idx];
              if (!p) return null;
              const heights = [140, 180, 110];
              const colors = ['#c0c0c0', '#fadb14', '#cd7f32'];
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 28 }}>{PODIUM[idx]}</span>
                  <div style={{ ...podiumAvatar, background: colors[idx] }}>
                    {p.login?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{p.login}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>⭐ {p.points} pts</div>
                  <div style={{ ...podiumBar, height: heights[idx], background: colors[idx] + 'aa' }}>
                    <span style={{ fontWeight: 800, fontSize: 20, color: colors[idx] }}>{idx + 1}º</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Participantes */}
      <div style={card}>
        <h3 style={sectionTitle}>👥 Participantes</h3>
        <div style={participantGrid}>
          {participants.map((p, i) => (
            <div key={p._id || p} style={participantItem}>
              <div style={participantAvatar}>{(p.login || '?')[0].toUpperCase()}</div>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{p.login || p.name || p}</span>
              {isManager && (
                <button onClick={() => removeParticipant(p._id || p)} style={btnRemove}>✕</button>
              )}
            </div>
          ))}
        </div>
        {participants.length === 0 && <p style={emptyText}>Nenhum participante ainda.</p>}

        {isManager && (
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <select value={addUserId} onChange={e => setAddUserId(e.target.value)} style={selectStyle}>
              <option value=''>➕ Selecionar jogador para adicionar...</option>
              {nonParticipants.map(u => (
                <option key={u._id} value={u._id}>{u.login} — {u.name}</option>
              ))}
            </select>
            <button onClick={addParticipant} disabled={!addUserId} style={btnGreen}>Adicionar</button>
          </div>
        )}
      </div>

      {/* Chat */}
      <div style={card}>
        <h3 style={sectionTitle}>💬 Chat do Torneio</h3>
        <div style={chatBox}>
          {messages.length === 0 && <p style={emptyText}>Nenhuma mensagem ainda. Seja o primeiro! 👋</p>}
          {messages.map(m => (
            <div key={m._id} style={chatMsg}>
              <div style={chatAvatar}>{(m.from?.login || '?')[0].toUpperCase()}</div>
              <div>
                <span style={{ fontWeight: 700, fontSize: 13, color: '#1677ff' }}>{m.from?.login}</span>
                <p style={{ margin: '2px 0 0', fontSize: 14 }}>{m.content}</p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={sendMessage} style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder='Digite uma mensagem...' required style={chatInput} />
          <button type='submit' style={btnBlue}>📤 Enviar</button>
        </form>
      </div>
    </div>
  );
}

const page = { padding: '24px 32px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 };
const headerCard = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001' };
const titleStyle = { margin: '0 0 8px', fontSize: 26, color: '#1a1a2e' };
const badge = { borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 };
const descCard = { background: '#f0f4ff', border: '1px solid #c0cfe8', borderRadius: 12, padding: '12px 16px', fontSize: 14, color: '#334', display: 'flex', alignItems: 'flex-start' };
const card = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001' };
const sectionTitle = { margin: '0 0 16px', fontSize: 18, color: '#1a1a2e', fontWeight: 700 };
const podiumSection = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001', textAlign: 'center' };
const podiumRow = { display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 24, marginTop: 16 };
const podiumAvatar = { width: 52, height: 52, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#fff' };
const podiumBar = { width: 80, borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const participantGrid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 };
const participantItem = { display: 'flex', alignItems: 'center', gap: 8, background: '#f5f7fa', borderRadius: 10, padding: '8px 12px' };
const participantAvatar = { width: 32, height: 32, borderRadius: '50%', background: '#1677ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 };
const btnRemove = { marginLeft: 'auto', background: 'none', border: 'none', color: '#ff4d4f', cursor: 'pointer', fontSize: 14, fontWeight: 700 };
const selectStyle = { flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d9d9d9', fontSize: 14 };
const chatBox = { maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' };
const chatMsg = { display: 'flex', gap: 10, alignItems: 'flex-start' };
const chatAvatar = { width: 32, height: 32, borderRadius: '50%', background: '#1677ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 };
const chatInput = { flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #d9d9d9', fontSize: 14 };
const emptyText = { color: '#aaa', fontSize: 14, textAlign: 'center', padding: '12px 0' };
const btnBlue = { background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const btnGreen = { background: '#52c41a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, fontWeight: 600 };

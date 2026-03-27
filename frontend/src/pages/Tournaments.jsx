import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const TYPES = ['single_elimination','double_elimination','swiss','round_robin','draft','sealed','ladder'];

const TYPE_DESCRIPTIONS = {
  single_elimination: 'Eliminação simples: o perdedor é eliminado imediatamente. Ideal para número de participantes em potência de 2.',
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

export default function Tournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [form, setForm] = useState({ name: '', type: 'swiss', startDate: '', endDate: '', maxParticipants: '', ladder_max_rounds: 4 });
  const [showForm, setShowForm] = useState(false);
  const role = localStorage.getItem('role');
  const navigate = useNavigate();

  const load = () => api.get('/tournaments').then(r => setTournaments(r.data));
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    await api.post('/tournaments', form);
    load();
    setShowForm(false);
    setForm({ name: '', type: 'swiss', startDate: '', endDate: '', maxParticipants: '', ladder_max_rounds: 4 });
  };

  const join = async (id) => {
    try {
      await api.post(`/tournaments/${id}/join`);
      load();
    } catch (e) { alert(e.response?.data?.message || 'Erro ao se inscrever'); }
  };

  const deleteTournament = async (id) => {
    if (!window.confirm('Deletar este torneio?')) return;
    try { await api.delete(`/tournaments/${id}`); load(); }
    catch (e) { alert(e.response?.data?.message || 'Erro ao deletar'); }
  };

  return (
    <div style={page}>
      <div style={header}>
        <h2 style={title}>🏟️ Torneios</h2>
        {(role === 'admin' || role === 'organizer') && (
          <button onClick={() => setShowForm(!showForm)} style={btnPrimary}>
            {showForm ? '✕ Cancelar' : '➕ Novo Torneio'}
          </button>
        )}
      </div>

      {showForm && (
        <div style={card}>
          <h3 style={{ marginTop: 0, color: '#1a1a2e' }}>🆕 Criar Torneio</h3>
          <form onSubmit={create} style={formGrid}>
            <input style={input} placeholder="Nome do torneio" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            <select style={input} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_ICON[t]} {t}</option>)}
            </select>
            <div style={descBox}>{TYPE_DESCRIPTIONS[form.type]}</div>
            <input style={input} type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
            <input style={input} type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
            <input style={input} type="number" placeholder="Máx. participantes" value={form.maxParticipants} onChange={e => setForm({ ...form, maxParticipants: e.target.value })} />
            {form.type === 'ladder' && (
              <input style={input} type="number" placeholder="Máx. rodadas (mín. 4)" min="4" value={form.ladder_max_rounds} onChange={e => setForm({ ...form, ladder_max_rounds: Math.max(4, parseInt(e.target.value) || 4) })} />
            )}
            <button type="submit" style={{ ...btnPrimary, gridColumn: '1 / -1' }}>🚀 Criar Torneio</button>
          </form>
        </div>
      )}

      <div style={grid}>
        {tournaments.map(t => (
          <div key={t._id} style={tCard}>
            <div style={tCardTop}>
              <span style={{ fontSize: 28 }}>{TYPE_ICON[t.type] || '🎮'}</span>
              <span style={{ ...statusBadge, background: STATUS_COLOR[t.status] + '22', color: STATUS_COLOR[t.status] }}>
                {STATUS_LABEL[t.status]}
              </span>
            </div>
            <h3 style={tName}>{t.name}</h3>
            <p style={tMeta}>{t.type} &nbsp;·&nbsp; {t.participants?.length || 0}{t.maxParticipants ? `/${t.maxParticipants}` : ''} jogadores</p>
            <div style={tActions}>
              <button onClick={() => navigate(`/tournaments/${t._id}`)} style={btnBlue}>👁️ Ver</button>
              {t.status === 'open' && <button onClick={() => join(t._id)} style={btnGreen}>✅ Inscrever</button>}
              {role === 'admin' && <button onClick={() => deleteTournament(t._id)} style={btnRed}>🗑️</button>}
            </div>
          </div>
        ))}
      </div>
      {tournaments.length === 0 && <div style={empty}>😴 Nenhum torneio encontrado. Crie o primeiro!</div>}
    </div>
  );
}

const page = { padding: '24px 32px', maxWidth: 1100, margin: '0 auto' };
const header = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 };
const title = { fontSize: 28, margin: 0, color: '#1a1a2e' };
const card = { background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 2px 8px #0001' };
const formGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };
const input = { padding: '10px 14px', borderRadius: 8, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none', width: '100%', boxSizing: 'border-box' };
const descBox = { gridColumn: '1 / -1', background: '#f0f4ff', border: '1px solid #c0cfe8', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#334' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 };
const tCard = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px #0001', display: 'flex', flexDirection: 'column', gap: 8 };
const tCardTop = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const tName = { margin: 0, fontSize: 18, color: '#1a1a2e' };
const tMeta = { margin: 0, color: '#888', fontSize: 13 };
const tActions = { display: 'flex', gap: 8, marginTop: 8 };
const statusBadge = { borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 };
const btnPrimary = { background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 15, fontWeight: 600 };
const btnBlue = { background: '#e6f4ff', color: '#1677ff', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnGreen = { background: '#f6ffed', color: '#52c41a', border: 'none', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnRed = { background: '#fff1f0', color: '#ff4d4f', border: 'none', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 13 };
const empty = { textAlign: 'center', padding: 48, color: '#aaa', fontSize: 16 };

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const BRACKET_LABEL = { winners: '🏆 Chave Principal', losers: '💀 Chave de Perdedores', grand_final: '🌟 Grande Final' };
const TYPE_ICON = { single_elimination:'⚔️', double_elimination:'🔁', swiss:'🇨🇭', round_robin:'🔄', draft:'🃏', sealed:'📦', ladder:'🪜' };
const STATUS_COLOR = { open: '#52c41a', ongoing: '#1677ff', closed: '#ff4d4f' };
const STATUS_LABEL = { open: '🟢 Aberto', ongoing: '🔵 Em andamento', closed: '🔴 Encerrado' };
const PODIUM_COLORS = ['#fadb14', '#c0c0c0', '#cd7f32'];
const PODIUM_EMOJI = ['🥇', '🥈', '🥉'];

export default function Matches() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [scoreboard, setScoreboard] = useState(null);
  const role = localStorage.getItem('role');
  const isManager = role === 'admin' || role === 'organizer';

  const load = async () => {
    const { data } = await api.get(`/matches/tournament/${id}`);
    setMatches(data.matches || data);
    if (data.tournament) setTournament(data.tournament);
    if (data.scoreboard) setScoreboard(data.scoreboard);
  };

  useEffect(() => { load(); }, [id]);

  const setResult = async (matchId, winner) => {
    try { await api.put(`/matches/${matchId}/result`, { winner }); load(); }
    catch (e) { alert(e.response?.data?.message || 'Erro ao registrar resultado'); }
  };

  const setDraw = async (matchId) => {
    try { await api.put(`/matches/${matchId}/result`, { draw: true }); load(); }
    catch (e) { alert(e.response?.data?.message || 'Erro ao registrar empate'); }
  };

  const grouped = matches.reduce((acc, m) => {
    const key = `R${m.round}__${m.bracket || 'winners'}`;
    if (!acc[key]) acc[key] = { round: m.round, bracket: m.bracket || 'winners', matches: [] };
    acc[key].matches.push(m);
    return acc;
  }, {});

  const groups = Object.values(grouped).sort((a, b) =>
    a.round !== b.round ? a.round - b.round : a.bracket.localeCompare(b.bracket)
  );

  const type = tournament?.type;
  const showScoreboard = scoreboard && ['swiss', 'round_robin', 'ladder'].includes(type);
  const isLadder = type === 'ladder';
  const ladderRanking = tournament?.ladder_ranking || [];
  const isClosed = tournament?.status === 'closed';
  const podiumPlayers = scoreboard?.slice(0, 3) || [];

  return (
    <div style={page}>
      {/* Header */}
      <div style={headerCard}>
        <button onClick={() => navigate(`/tournaments/${id}`)} style={backBtn}>← Voltar</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <span style={{ fontSize: 36 }}>{TYPE_ICON[type] || '🎮'}</span>
          <div>
            <h2 style={titleStyle}>⚔️ Partidas — {tournament?.name}</h2>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ ...badge, background: STATUS_COLOR[tournament?.status] + '22', color: STATUS_COLOR[tournament?.status] }}>
                {STATUS_LABEL[tournament?.status]}
              </span>
              <span style={{ ...badge, background: '#f0f4ff', color: '#1677ff' }}>{type}</span>
              {type === 'swiss' && tournament?.swiss_rounds && (
                <span style={{ ...badge, background: '#f6ffed', color: '#52c41a' }}>🔢 {tournament.swiss_rounds} rodadas</span>
              )}
              {type === 'ladder' && tournament?.ladder_max_rounds && (
                <span style={{ ...badge, background: '#f6ffed', color: '#52c41a' }}>🪜 Máx. {tournament.ladder_max_rounds} rodadas</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pódio — torneios encerrados */}
      {isClosed && podiumPlayers.length > 0 && (
        <div style={podiumSection}>
          <h3 style={sectionTitle}>🏆 Pódio Final</h3>
          <div style={podiumRow}>
            {[1, 0, 2].map(idx => {
              const p = podiumPlayers[idx];
              if (!p) return null;
              const heights = [140, 180, 110];
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 28 }}>{PODIUM_EMOJI[idx]}</span>
                  <div style={{ ...podiumAvatar, background: PODIUM_COLORS[idx] }}>
                    {p.login?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.login}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>⭐ {p.points} pts</div>
                  <div style={{ ...podiumBar, height: heights[idx], background: PODIUM_COLORS[idx] + '55' }}>
                    <span style={{ fontWeight: 800, fontSize: 22, color: PODIUM_COLORS[idx] }}>{idx + 1}º</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={championBanner}>
            🎉 Campeão: <strong>{podiumPlayers[0]?.login}</strong> com {podiumPlayers[0]?.points} pontos!
          </div>
        </div>
      )}

      {/* Ranking Ladder */}
      {isLadder && ladderRanking.length > 0 && (
        <div style={card}>
          <h3 style={sectionTitle}>🏅 Ranking da Escada</h3>
          <table style={table}>
            <thead><tr style={thead}>
              <th style={th}>#</th><th style={th}>Jogador</th><th style={th}>⭐ Pts</th>
              <th style={th}>✅ V</th><th style={th}>🤝 E</th><th style={th}>❌ D</th>
            </tr></thead>
            <tbody>
              {ladderRanking.map((p, i) => {
                const row = scoreboard?.find(s => String(s._id) === String(p._id || p));
                return (
                  <tr key={p._id || p} style={{ background: i < 3 ? PODIUM_COLORS[i] + '22' : '#fff', borderBottom: '1px solid #f0f0f0' }}>
                    <td style={td}><strong>{PODIUM_EMOJI[i] || `${i+1}º`}</strong></td>
                    <td style={td}><strong>{p.login || p.name || p}</strong></td>
                    <td style={{ ...td, color: '#1677ff', fontWeight: 700 }}>{row?.points ?? 0}</td>
                    <td style={td}>{row?.wins ?? 0}</td><td style={td}>{row?.draws ?? 0}</td><td style={td}>{row?.losses ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Classificação swiss / round_robin */}
      {showScoreboard && !isLadder && (
        <div style={card}>
          <h3 style={sectionTitle}>📊 Classificação</h3>
          <table style={table}>
            <thead><tr style={thead}>
              <th style={th}>#</th><th style={th}>Jogador</th><th style={th}>⭐ Pts</th>
              <th style={th}>✅ V</th><th style={th}>🤝 E</th><th style={th}>❌ D</th>
            </tr></thead>
            <tbody>
              {scoreboard.map((p, i) => (
                <tr key={p._id} style={{ background: i < 3 ? PODIUM_COLORS[i] + '22' : '#fff', borderBottom: '1px solid #f0f0f0' }}>
                  <td style={td}>{PODIUM_EMOJI[i] || `${i+1}º`}</td>
                  <td style={td}><strong>{p.login}</strong></td>
                  <td style={{ ...td, color: '#1677ff', fontWeight: 700 }}>{p.points}</td>
                  <td style={td}>{p.wins}</td><td style={td}>{p.draws}</td><td style={td}>{p.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>Vitória = 3pts · Empate = 1pt · Derrota = 0pts</p>
        </div>
      )}

      {/* Partidas por rodada */}
      {groups.map(group => (
        <div key={`${group.round}-${group.bracket}`} style={card}>
          <h3 style={{ ...sectionTitle, borderBottom: '2px solid #f0f0f0', paddingBottom: 10 }}>
            🎯 Rodada {group.round}
            {group.bracket !== 'winners' && <span style={{ ...badge, marginLeft: 10, background: '#fff1f0', color: '#ff4d4f' }}>{BRACKET_LABEL[group.bracket]}</span>}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {group.matches.map(m => (
              <div key={m._id} style={{ ...matchCard, borderLeft: `4px solid ${m.status === 'completed' ? '#52c41a' : '#1677ff'}` }}>
                <div style={matchPlayers}>
                  <div style={playerChip}>{m.playerA?.login?.[0]?.toUpperCase()} <span style={{ marginLeft: 6 }}>{m.playerA?.login}</span></div>
                  <span style={vsText}>VS</span>
                  <div style={playerChip}>{m.playerB?.login?.[0]?.toUpperCase()} <span style={{ marginLeft: 6 }}>{m.playerB?.login}</span></div>
                </div>
                <div style={{ marginTop: 8 }}>
                  {m.status === 'completed'
                    ? m.draw
                      ? <span style={drawBadge}>🤝 Empate</span>
                      : <span style={winBadge}>🏆 Vencedor: <strong>{m.winner?.login}</strong></span>
                    : isManager && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button onClick={() => setResult(m._id, m.playerA._id)} style={btnWin}>✅ Win {m.playerA?.login}</button>
                        <button onClick={() => setResult(m._id, m.playerB._id)} style={btnWin}>✅ Win {m.playerB?.login}</button>
                        {['swiss', 'round_robin', 'ladder'].includes(type) && (
                          <button onClick={() => setDraw(m._id)} style={btnDraw}>🤝 Empate</button>
                        )}
                      </div>
                    )
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {matches.length === 0 && (
        <div style={emptyCard}>⚔️ Nenhuma partida gerada ainda. Volte ao torneio para gerar!</div>
      )}
    </div>
  );
}

const page = { padding: '24px 32px', maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 };
const headerCard = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001' };
const backBtn = { background: 'none', border: 'none', color: '#1677ff', cursor: 'pointer', fontSize: 14, fontWeight: 600, padding: 0 };
const titleStyle = { margin: '0 0 8px', fontSize: 22, color: '#1a1a2e' };
const badge = { borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 };
const card = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001' };
const sectionTitle = { margin: '0 0 16px', fontSize: 17, color: '#1a1a2e', fontWeight: 700 };
const podiumSection = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001', textAlign: 'center' };
const podiumRow = { display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 24, marginTop: 8 };
const podiumAvatar = { width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 800, color: '#fff' };
const podiumBar = { width: 72, borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const championBanner = { marginTop: 16, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 10, padding: '10px 20px', fontSize: 16, display: 'inline-block' };
const table = { width: '100%', borderCollapse: 'collapse', borderRadius: 8, overflow: 'hidden' };
const thead = { background: '#1677ff', color: '#fff' };
const th = { padding: '10px 14px', textAlign: 'left', fontSize: 13, fontWeight: 600 };
const td = { padding: '10px 14px', fontSize: 14 };
const matchCard = { background: '#f9f9f9', borderRadius: 10, padding: '12px 16px', border: '1px solid #f0f0f0' };
const matchPlayers = { display: 'flex', alignItems: 'center', gap: 12 };
const playerChip = { display: 'flex', alignItems: 'center', background: '#e6f4ff', color: '#1677ff', borderRadius: 20, padding: '4px 12px', fontWeight: 700, fontSize: 14 };
const vsText = { fontWeight: 800, color: '#aaa', fontSize: 13 };
const winBadge = { background: '#f6ffed', color: '#52c41a', borderRadius: 8, padding: '4px 12px', fontSize: 13, display: 'inline-block' };
const drawBadge = { background: '#f5f5f5', color: '#888', borderRadius: 8, padding: '4px 12px', fontSize: 13, display: 'inline-block' };
const btnWin = { background: '#f6ffed', color: '#52c41a', border: '1px solid #b7eb8f', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnDraw = { background: '#f5f5f5', color: '#888', border: '1px solid #d9d9d9', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: 13 };
const emptyCard = { background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', color: '#aaa', fontSize: 16, boxShadow: '0 2px 8px #0001' };

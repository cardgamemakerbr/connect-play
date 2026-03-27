import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const BRACKET_LABEL = { winners: 'Chave Principal', losers: 'Chave de Perdedores', grand_final: '🏆 Grande Final' };

export default function Matches() {
  const { id } = useParams();
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
    try {
      await api.put(`/matches/${matchId}/result`, { winner });
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Erro ao registrar resultado');
    }
  };

  const setDraw = async (matchId) => {
    try {
      await api.put(`/matches/${matchId}/result`, { draw: true });
      load();
    } catch (e) {
      alert(e.response?.data?.message || 'Erro ao registrar empate');
    }
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

  return (
    <div style={{ padding: 24 }}>
      <h2>Partidas — {tournament?.name}</h2>
      <p>Tipo: <strong>{type}</strong> | Status: {tournament?.status}
        {type === 'swiss' && tournament?.swiss_rounds ? ` | Rodadas: ${tournament.swiss_rounds}` : ''}
      </p>

      {/* Ranking Ladder */}
      {isLadder && ladderRanking.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3>🏅 Ranking</h3>
          <table style={{ borderCollapse: 'collapse', minWidth: 300 }}>
            <thead>
              <tr style={{ background: '#f0f4ff' }}>
                <th style={th}>#</th>
                <th style={th}>Jogador</th>
                <th style={th}>Pts</th>
                <th style={th}>V</th>
                <th style={th}>E</th>
                <th style={th}>D</th>
              </tr>
            </thead>
            <tbody>
              {ladderRanking.map((p, i) => {
                const row = scoreboard?.find(s => s._id === (p._id || p));
                return (
                  <tr key={p._id || p}>
                    <td style={td}>{i + 1}º</td>
                    <td style={td}><strong>{p.login || p.name || p}</strong></td>
                    <td style={td}>{row?.points ?? 0}</td>
                    <td style={td}>{row?.wins ?? 0}</td>
                    <td style={td}>{row?.draws ?? 0}</td>
                    <td style={td}>{row?.losses ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela de pontuação swiss / round_robin */}
      {showScoreboard && !isLadder && (
        <div style={{ marginBottom: 24 }}>
          <h3>📊 Classificação</h3>
          <table style={{ borderCollapse: 'collapse', minWidth: 360 }}>
            <thead>
              <tr style={{ background: '#f0f4ff' }}>
                <th style={th}>#</th>
                <th style={th}>Jogador</th>
                <th style={th}>Pts</th>
                <th style={th}>V</th>
                <th style={th}>E</th>
                <th style={th}>D</th>
              </tr>
            </thead>
            <tbody>
              {scoreboard.map((p, i) => (
                <tr key={p._id}>
                  <td style={td}>{i + 1}º</td>
                  <td style={td}><strong>{p.login}</strong></td>
                  <td style={td}><strong>{p.points}</strong></td>
                  <td style={td}>{p.wins}</td>
                  <td style={td}>{p.draws}</td>
                  <td style={td}>{p.losses}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>V=Vitórias E=Empates D=Derrotas | Vitória=3pts Empate=1pt</p>
        </div>
      )}

      {/* Partidas por rodada */}
      {groups.map(group => (
        <div key={`${group.round}-${group.bracket}`} style={{ marginBottom: 24 }}>
          <h3 style={{ borderBottom: '1px solid #ddd', paddingBottom: 4 }}>
            Rodada {group.round}
            {group.bracket !== 'winners' && ` — ${BRACKET_LABEL[group.bracket] || group.bracket}`}
          </h3>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {group.matches.map(m => (
              <li key={m._id} style={{ margin: '8px 0', padding: '8px 12px', background: '#f9f9f9', borderRadius: 6, border: '1px solid #eee' }}>
                <strong>{m.playerA?.login}</strong> vs <strong>{m.playerB?.login}</strong>
                {m.status === 'completed'
                  ? m.draw
                    ? <span style={{ marginLeft: 12, color: '#888' }}>🤝 Empate</span>
                    : <span style={{ marginLeft: 12, color: '#2a7' }}>✓ Vencedor: <strong>{m.winner?.login}</strong></span>
                  : isManager && (
                    <span style={{ marginLeft: 12 }}>
                      <button onClick={() => setResult(m._id, m.playerA._id)} style={{ marginRight: 4 }}>Win {m.playerA?.login}</button>
                      <button onClick={() => setResult(m._id, m.playerB._id)} style={{ marginRight: 4 }}>Win {m.playerB?.login}</button>
                      {['swiss', 'round_robin'].includes(type) && (
                        <button onClick={() => setDraw(m._id)} style={{ color: '#888' }}>Empate</button>
                      )}
                    </span>
                  )
                }
              </li>
            ))}
          </ul>
        </div>
      ))}

      {matches.length === 0 && <p>Nenhuma partida gerada ainda.</p>}
      {tournament?.status === 'closed' && (
        <div style={{ marginTop: 24, padding: 16, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8 }}>
          🏆 Torneio encerrado!
          {showScoreboard && scoreboard?.length > 0 && (
            <span> Campeão: <strong>{scoreboard[0].login}</strong> ({scoreboard[0].points} pts)</span>
          )}
        </div>
      )}
    </div>
  );
}

const th = { padding: '6px 12px', border: '1px solid #ddd', textAlign: 'left', fontSize: 13 };
const td = { padding: '5px 12px', border: '1px solid #eee', fontSize: 13 };

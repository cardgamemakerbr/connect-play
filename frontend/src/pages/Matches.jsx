import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const BRACKET_LABEL = { winners: 'Chave Principal', losers: 'Chave de Perdedores', grand_final: '🏆 Grande Final' };

export default function Matches() {
  const { id } = useParams();
  const [matches, setMatches] = useState([]);
  const [tournament, setTournament] = useState(null);
  const [ladderRanking, setLadderRanking] = useState([]);
  const role = localStorage.getItem('role');
  const isManager = role === 'admin' || role === 'organizer';

  const load = () => {
    api.get(`/matches/tournament/${id}`).then(r => setMatches(r.data));
    api.get('/tournaments').then(r => {
      const t = r.data.find(t => t._id === id);
      setTournament(t);
      if (t?.type === 'ladder' && t.ladder_ranking?.length) {
        setLadderRanking(t.ladder_ranking);
      }
    });
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

  // Agrupa por rodada e bracket
  const grouped = matches.reduce((acc, m) => {
    const key = `R${m.round}__${m.bracket || 'winners'}`;
    if (!acc[key]) acc[key] = { round: m.round, bracket: m.bracket || 'winners', matches: [] };
    acc[key].matches.push(m);
    return acc;
  }, {});

  const groups = Object.values(grouped).sort((a, b) =>
    a.round !== b.round ? a.round - b.round : a.bracket.localeCompare(b.bracket)
  );

  const isLadder = tournament?.type === 'ladder';

  return (
    <div style={{ padding: 24 }}>
      <h2>Partidas — {tournament?.name}</h2>
      <p>Tipo: <strong>{tournament?.type}</strong> | Status: {tournament?.status}</p>

      {isLadder && ladderRanking.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3>🏅 Ranking Atual</h3>
          <ol>
            {ladderRanking.map((p, i) => (
              <li key={p._id || p}><strong>{p.login || p.name || p}</strong></li>
            ))}
          </ol>
        </div>
      )}

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
                  ? <span style={{ marginLeft: 12, color: '#2a7' }}>✓ Vencedor: <strong>{m.winner?.login}</strong></span>
                  : isManager && (
                    <span style={{ marginLeft: 12 }}>
                      <button onClick={() => setResult(m._id, m.playerA._id)} style={{ marginRight: 4 }}>
                        Win {m.playerA?.login}
                      </button>
                      <button onClick={() => setResult(m._id, m.playerB._id)}>
                        Win {m.playerB?.login}
                      </button>
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
        </div>
      )}
    </div>
  );
}

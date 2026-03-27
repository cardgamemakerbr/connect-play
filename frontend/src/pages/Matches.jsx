import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export default function Matches() {
  const { id } = useParams();
  const [matches, setMatches] = useState([]);
  const role = localStorage.getItem('role');

  useEffect(() => {
    api.get(`/matches/tournament/${id}`).then(r => setMatches(r.data));
  }, [id]);

  const setResult = async (matchId, winner) => {
    const { data } = await api.put(`/matches/${matchId}/result`, { winner });
    setMatches(matches.map(m => m._id === matchId ? data : m));
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Partidas</h2>
      <ul>
        {matches.map(m => (
          <li key={m._id} style={{ margin: '8px 0' }}>
            Rodada {m.round}: <strong>{m.playerA?.login}</strong> vs <strong>{m.playerB?.login}</strong>
            {m.status === 'completed'
              ? <span> — Vencedor: {m.winner?.login}</span>
              : (role === 'admin' || role === 'organizer') && (
                <>
                  <button onClick={() => setResult(m._id, m.playerA._id)}>Win {m.playerA?.login}</button>
                  <button onClick={() => setResult(m._id, m.playerB._id)}>Win {m.playerB?.login}</button>
                </>
              )
            }
          </li>
        ))}
      </ul>
    </div>
  );
}

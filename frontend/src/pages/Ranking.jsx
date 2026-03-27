import React, { useEffect, useState } from 'react';
import api from '../services/api';

const MEDAL = ['🥇', '🥈', '🥉'];

export default function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ranking').then(r => { setRanking(r.data); setLoading(false); });
  }, []);

  if (loading) return <p style={styles.loading}>Carregando ranking... ⏳</p>;

  return (
    <div style={styles.page}>
      <h2 style={styles.title}>🏆 Ranking Global</h2>
      <p style={styles.subtitle}>Pontuação acumulada em todos os torneios encerrados</p>
      <p style={styles.legend}>🥇 1º lugar = 5pts &nbsp;|&nbsp; 🥈 2º = 4pts &nbsp;|&nbsp; 🥉 3º = 3pts &nbsp;|&nbsp; 4º = 2pts &nbsp;|&nbsp; 5º = 1pt</p>

      {ranking.length === 0 ? (
        <div style={styles.empty}>😴 Nenhum torneio encerrado ainda. Jogue para aparecer aqui!</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr style={styles.thead}>
              <th style={styles.th}>#</th>
              <th style={styles.th}>Jogador</th>
              <th style={styles.th}>⭐ Pts</th>
              <th style={styles.th}>🥇</th>
              <th style={styles.th}>🥈</th>
              <th style={styles.th}>🥉</th>
              <th style={styles.th}>🎮 Torneios</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((p, i) => (
              <tr key={p._id} style={{ ...styles.tr, background: i < 3 ? ['#fffbe6', '#f0f8ff', '#fff5f5'][i] : '#fff' }}>
                <td style={styles.td}><span style={{ fontSize: 20 }}>{MEDAL[i] || `${i + 1}º`}</span></td>
                <td style={styles.td}><strong>{p.login}</strong> <span style={{ color: '#888', fontSize: 13 }}>{p.name}</span></td>
                <td style={{ ...styles.td, fontWeight: 'bold', color: '#1677ff', fontSize: 18 }}>{p.points}</td>
                <td style={styles.td}>{p.gold || 0}</td>
                <td style={styles.td}>{p.silver || 0}</td>
                <td style={styles.td}>{p.bronze || 0}</td>
                <td style={styles.td}>{p.tournaments || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles = {
  page: { padding: '24px 32px', maxWidth: 800, margin: '0 auto' },
  title: { fontSize: 28, marginBottom: 4, color: '#1a1a2e' },
  subtitle: { color: '#666', marginBottom: 8, fontSize: 15 },
  legend: { background: '#f0f4ff', border: '1px solid #c0cfe8', borderRadius: 8, padding: '8px 14px', fontSize: 13, marginBottom: 24, display: 'inline-block' },
  table: { width: '100%', borderCollapse: 'collapse', borderRadius: 10, overflow: 'hidden', boxShadow: '0 2px 8px #0001' },
  thead: { background: '#1677ff', color: '#fff' },
  th: { padding: '12px 16px', textAlign: 'left', fontSize: 14, fontWeight: 600 },
  tr: { borderBottom: '1px solid #f0f0f0', transition: 'background 0.2s' },
  td: { padding: '12px 16px', fontSize: 15 },
  empty: { background: '#f9f9f9', borderRadius: 10, padding: 32, textAlign: 'center', color: '#888', fontSize: 16 },
  loading: { padding: 32, textAlign: 'center', fontSize: 16 },
};

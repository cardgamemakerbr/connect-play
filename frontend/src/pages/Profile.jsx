import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Profile() {
  const [user, setUser] = useState(null);
  const [rankData, setRankData] = useState(null);

  useEffect(() => {
    api.get('/users/me').then(r => setUser(r.data));
    api.get('/ranking').then(r => {
      const userId = r.data; // será filtrado abaixo
      setRankData(r.data);
    });
  }, []);

  if (!user) return <p style={{ padding: 32, textAlign: 'center' }}>Carregando... ⏳</p>;

  const myRank = rankData?.find(p => p.login === user.login);
  const myPos = rankData ? rankData.findIndex(p => p.login === user.login) + 1 : null;
  const ROLE_LABEL = { admin: '👑 Admin', organizer: '🎯 Organizador', player: '🎮 Jogador' };

  return (
    <div style={page}>
      <div style={profileCard}>
        <div style={avatar}>{user.name?.[0]?.toUpperCase() || '?'}</div>
        <div>
          <h2 style={name}>{user.name}</h2>
          <p style={meta}>@{user.login} &nbsp;·&nbsp; {user.email}</p>
          <span style={roleBadge}>{ROLE_LABEL[user.role] || user.role}</span>
        </div>
      </div>

      {myRank && (
        <div style={statsRow}>
          <div style={statCard}><div style={statNum}>#{myPos}</div><div style={statLabel}>Posição Global</div></div>
          <div style={statCard}><div style={statNum}>⭐ {myRank.points}</div><div style={statLabel}>Pontos</div></div>
          <div style={statCard}><div style={statNum}>🥇 {myRank.gold}</div><div style={statLabel}>Ouros</div></div>
          <div style={statCard}><div style={statNum}>🥈 {myRank.silver}</div><div style={statLabel}>Pratas</div></div>
          <div style={statCard}><div style={statNum}>🥉 {myRank.bronze}</div><div style={statLabel}>Bronzes</div></div>
          <div style={statCard}><div style={statNum}>🎮 {myRank.tournaments}</div><div style={statLabel}>Torneios</div></div>
        </div>
      )}

      <div style={section}>
        <h3 style={sectionTitle}>🏆 Troféus e Medalhas</h3>
        {!user.trophies?.length
          ? <div style={empty}>😴 Nenhum troféu ainda. Participe de torneios para conquistar!</div>
          : <div style={trophyGrid}>
              {user.trophies.map(t => (
                <div key={t._id} style={trophyCard}>
                  <span style={{ fontSize: 32 }}>{t.type === 'medal' ? '🥇' : '🏆'}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
                    {t.description && <div style={{ color: '#888', fontSize: 13 }}>{t.description}</div>}
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

const page = { padding: '24px 32px', maxWidth: 800, margin: '0 auto' };
const profileCard = { background: '#fff', borderRadius: 16, padding: 28, display: 'flex', alignItems: 'center', gap: 24, boxShadow: '0 2px 8px #0001', marginBottom: 20 };
const avatar = { width: 72, height: 72, borderRadius: '50%', background: '#1677ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 800, flexShrink: 0 };
const name = { margin: '0 0 4px', fontSize: 24, color: '#1a1a2e' };
const meta = { margin: '0 0 8px', color: '#888', fontSize: 14 };
const roleBadge = { background: '#f0f4ff', color: '#1677ff', borderRadius: 20, padding: '3px 12px', fontSize: 13, fontWeight: 600 };
const statsRow = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 12, marginBottom: 20 };
const statCard = { background: '#fff', borderRadius: 12, padding: '16px 12px', textAlign: 'center', boxShadow: '0 2px 8px #0001' };
const statNum = { fontSize: 22, fontWeight: 800, color: '#1a1a2e', marginBottom: 4 };
const statLabel = { fontSize: 12, color: '#888' };
const section = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001' };
const sectionTitle = { margin: '0 0 16px', fontSize: 18, color: '#1a1a2e' };
const trophyGrid = { display: 'flex', flexDirection: 'column', gap: 12 };
const trophyCard = { display: 'flex', alignItems: 'center', gap: 16, background: '#fffbe6', borderRadius: 10, padding: '12px 16px', border: '1px solid #ffe58f' };
const empty = { textAlign: 'center', padding: 32, color: '#aaa', fontSize: 15, background: '#fafafa', borderRadius: 10 };

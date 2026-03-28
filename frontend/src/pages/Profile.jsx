import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ROLE_LABEL = { admin: '👑 Admin', organizer: '🎯 Organizador', player: '🎮 Jogador' };
const ROLE_COLOR = { admin: '#ff4d4f', organizer: '#faad14', player: '#1677ff' };

export default function Profile() {
  const [user, setUser] = useState(null);
  const [rankData, setRankData] = useState(null);

  useEffect(() => {
    api.get('/users/me').then(r => setUser(r.data));
    api.get('/ranking').then(r => setRankData(r.data));
  }, []);

  if (!user) return <p style={{ padding: 32, textAlign: 'center' }}>Carregando... ⏳</p>;

  const myRank = rankData?.find(p => p.login === user.login);
  const myPos = rankData ? rankData.findIndex(p => p.login === user.login) + 1 : null;

  const trophies = user.trophies?.filter(t => t.type === 'trophy') || [];
  const medals = user.trophies?.filter(t => t.type === 'medal') || [];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

  return (
    <div style={page}>
      {/* Card de perfil */}
      <div style={profileCard}>
        <div style={avatar}>{user.name?.[0]?.toUpperCase() || '?'}</div>
        <div style={{ flex: 1 }}>
          <h2 style={nameStyle}>{user.name}</h2>
          <p style={metaStyle}>@{user.login} &nbsp;·&nbsp; {user.email}</p>
          <span style={{ ...roleBadge, background: ROLE_COLOR[user.role] + '22', color: ROLE_COLOR[user.role] }}>
            {ROLE_LABEL[user.role] || user.role}
          </span>
        </div>
        {myPos > 0 && (
          <div style={rankBadge}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#fadb14' }}>#{myPos}</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>Ranking Global</div>
          </div>
        )}
      </div>

      {/* Estatísticas */}
      {myRank && (
        <div style={statsRow}>
          {[
            ['⭐', myRank.points, 'Pontos'],
            ['🥇', myRank.gold, 'Ouros'],
            ['🥈', myRank.silver, 'Pratas'],
            ['🥉', myRank.bronze, 'Bronzes'],
            ['🎮', myRank.tournaments, 'Torneios'],
            ['🏆', trophies.length, 'Troféus'],
            ['🎖️', medals.length, 'Medalhas'],
          ].map(([icon, val, label]) => (
            <div key={label} style={statCard}>
              <div style={statIcon}>{icon}</div>
              <div style={statNum}>{val ?? 0}</div>
              <div style={statLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Troféus */}
      <div style={section}>
        <h3 style={sectionTitle}>🏆 Troféus de Campeão</h3>
        {trophies.length === 0
          ? <div style={empty}>😴 Nenhum troféu ainda. Vença torneios para conquistar!</div>
          : <div style={awardGrid}>
              {trophies.map(t => (
                <div key={t._id} style={trophyCard}>
                  <div style={trophyIcon}>🏆</div>
                  <div style={{ flex: 1 }}>
                    <div style={awardName}>{t.name}</div>
                    {t.description && <div style={awardDesc}>{t.description}</div>}
                    <div style={awardMeta}>
                      {t.tournament && <span>🎮 {t.tournament.name}</span>}
                      {t.createdAt && <span style={{ marginLeft: 8 }}>📅 {formatDate(t.createdAt)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>

      {/* Medalhas */}
      <div style={section}>
        <h3 style={sectionTitle}>🎖️ Medalhas de Participação</h3>
        {medals.length === 0
          ? <div style={empty}>🎖️ Nenhuma medalha ainda. Participe de torneios!</div>
          : <div style={awardGrid}>
              {medals.map(t => (
                <div key={t._id} style={medalCard}>
                  <div style={medalIcon}>🥇</div>
                  <div style={{ flex: 1 }}>
                    <div style={awardName}>{t.name}</div>
                    {t.description && <div style={awardDesc}>{t.description}</div>}
                    <div style={awardMeta}>
                      {t.tournament && <span>🎮 {t.tournament.name}</span>}
                      {t.createdAt && <span style={{ marginLeft: 8 }}>📅 {formatDate(t.createdAt)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

const page = { padding: '24px 32px', maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 };
const profileCard = { background: '#fff', borderRadius: 16, padding: 28, display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 2px 8px #0001' };
const avatar = { width: 80, height: 80, borderRadius: '50%', background: '#1677ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, flexShrink: 0 };
const nameStyle = { margin: '0 0 4px', fontSize: 24, color: '#1a1a2e' };
const metaStyle = { margin: '0 0 8px', color: '#888', fontSize: 14 };
const roleBadge = { borderRadius: 20, padding: '3px 14px', fontSize: 13, fontWeight: 600 };
const rankBadge = { background: '#1a1a2e', borderRadius: 12, padding: '12px 20px', textAlign: 'center', flexShrink: 0 };
const statsRow = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 12 };
const statCard = { background: '#fff', borderRadius: 12, padding: '16px 8px', textAlign: 'center', boxShadow: '0 2px 8px #0001' };
const statIcon = { fontSize: 24, marginBottom: 4 };
const statNum = { fontSize: 22, fontWeight: 800, color: '#1a1a2e' };
const statLabel = { fontSize: 11, color: '#888', marginTop: 2 };
const section = { background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px #0001' };
const sectionTitle = { margin: '0 0 16px', fontSize: 18, color: '#1a1a2e', fontWeight: 700 };
const awardGrid = { display: 'flex', flexDirection: 'column', gap: 12 };
const trophyCard = { display: 'flex', alignItems: 'flex-start', gap: 16, background: '#fffbe6', borderRadius: 12, padding: '14px 18px', border: '1px solid #ffe58f' };
const medalCard = { display: 'flex', alignItems: 'flex-start', gap: 16, background: '#f0f4ff', borderRadius: 12, padding: '14px 18px', border: '1px solid #c0cfe8' };
const trophyIcon = { fontSize: 36, flexShrink: 0 };
const medalIcon = { fontSize: 36, flexShrink: 0 };
const awardName = { fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 2 };
const awardDesc = { fontSize: 13, color: '#666', marginBottom: 6 };
const awardMeta = { fontSize: 12, color: '#aaa', display: 'flex', flexWrap: 'wrap', gap: 4 };
const empty = { textAlign: 'center', padding: '24px 0', color: '#aaa', fontSize: 14, background: '#fafafa', borderRadius: 10 };

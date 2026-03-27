import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => { api.get('/users/me').then(r => setUser(r.data)); }, []);

  if (!user) return <p>Carregando...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Perfil</h2>
      <p><strong>Nome:</strong> {user.name}</p>
      <p><strong>Login:</strong> {user.login}</p>
      <p><strong>E-mail:</strong> {user.email}</p>
      <p><strong>Papel:</strong> {user.role}</p>
      <h3>Troféus e Medalhas</h3>
      {user.trophies?.length === 0
        ? <p>Nenhum troféu ainda.</p>
        : <ul>{user.trophies?.map(t => <li key={t._id}>{t.type === 'medal' ? '🥇' : '🏆'} {t.name} — {t.description}</li>)}</ul>
      }
    </div>
  );
}

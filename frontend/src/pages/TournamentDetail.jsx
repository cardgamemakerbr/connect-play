import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    api.get('/tournaments').then(r => setTournament(r.data.find(t => t._id === id)));
    api.get(`/messages/tournament/${id}`).then(r => setMessages(r.data));
  }, [id]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const { data } = await api.post('/messages', { tournament: id, content: text });
    setMessages([...messages, data]);
    setText('');
  };

  if (!tournament) return <p>Carregando...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h2>{tournament.name}</h2>
      <p>Tipo: {tournament.type} | Status: {tournament.status}</p>
      <p>Participantes: {tournament.participants?.length}</p>
      <button onClick={() => navigate(`/tournaments/${id}/matches`)}>Ver Partidas</button>

      <h3>Mensagens</h3>
      <ul>
        {messages.map(m => (
          <li key={m._id}><strong>{m.from?.login}:</strong> {m.content}</li>
        ))}
      </ul>
      <form onSubmit={sendMessage}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Mensagem..." required />
        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}

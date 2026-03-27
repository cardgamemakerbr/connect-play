import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Login() {
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      navigate('/tournaments');
    } catch {
      setError('Credenciais inválidas');
    }
  };

  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: '60px auto' }}>
      <h2>Login</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <input placeholder="Login" value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} required /><br />
      <input type="password" placeholder="Senha" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required /><br />
      <button type="submit">Entrar</button>
      <p><a href="/register">Criar conta</a></p>
    </form>
  );
}

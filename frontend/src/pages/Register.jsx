import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', login: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', form);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao registrar');
    }
  };

  const field = (key, placeholder, type = 'text') => (
    <><input type={type} placeholder={placeholder} value={form[key]}
      onChange={e => setForm({ ...form, [key]: e.target.value })} required /><br /></>
  );

  return (
    <form onSubmit={submit} style={{ maxWidth: 320, margin: '60px auto' }}>
      <h2>Criar Conta</h2>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {field('name', 'Nome')}
      {field('email', 'E-mail', 'email')}
      {field('login', 'Login')}
      {field('password', 'Senha', 'password')}
      <button type="submit">Registrar</button>
    </form>
  );
}

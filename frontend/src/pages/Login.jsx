import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
      setError('Credenciais inválidas. Tente novamente.');
    }
  };

  return (
    <div style={page}>
      <div style={box}>
        <div style={logoArea}>🎮</div>
        <h2 style={title}>Connect Play</h2>
        <p style={sub}>Entre na sua conta para continuar</p>
        {error && <div style={errorBox}>⚠️ {error}</div>}
        <form onSubmit={submit} style={form_}>
          <label style={label}>Login</label>
          <input style={input} placeholder="Seu login" value={form.login} onChange={e => setForm({ ...form, login: e.target.value })} required />
          <label style={label}>Senha</label>
          <input style={input} type="password" placeholder="Sua senha" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <button type="submit" style={btn}>🚀 Entrar</button>
        </form>
        <p style={footer}>Não tem conta? <Link to="/register" style={{ color: '#1677ff' }}>Criar conta</Link></p>
      </div>
    </div>
  );
}

const page = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' };
const box = { background: '#fff', borderRadius: 16, padding: '40px 36px', width: 360, boxShadow: '0 4px 24px #0002' };
const logoArea = { fontSize: 48, textAlign: 'center', marginBottom: 8 };
const title = { textAlign: 'center', margin: '0 0 4px', fontSize: 26, color: '#1a1a2e' };
const sub = { textAlign: 'center', color: '#888', marginBottom: 24, fontSize: 14 };
const errorBox = { background: '#fff1f0', border: '1px solid #ffccc7', borderRadius: 8, padding: '10px 14px', color: '#cf1322', marginBottom: 16, fontSize: 14 };
const form_ = { display: 'flex', flexDirection: 'column', gap: 8 };
const label = { fontSize: 13, fontWeight: 600, color: '#444' };
const input = { padding: '10px 14px', borderRadius: 8, border: '1px solid #d9d9d9', fontSize: 15, outline: 'none' };
const btn = { background: '#1677ff', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8 };
const footer = { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' };

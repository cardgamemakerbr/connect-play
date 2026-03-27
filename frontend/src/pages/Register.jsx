import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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

  return (
    <div style={page}>
      <div style={box}>
        <div style={logoArea}>🎮</div>
        <h2 style={title}>Criar Conta</h2>
        <p style={sub}>Junte-se à plataforma de torneios</p>
        {error && <div style={errorBox}>⚠️ {error}</div>}
        <form onSubmit={submit} style={form_}>
          {[['name','Nome completo','text'],['email','E-mail','email'],['login','Login','text'],['password','Senha','password']].map(([k, ph, t]) => (
            <React.Fragment key={k}>
              <label style={label}>{ph}</label>
              <input style={input} type={t} placeholder={ph} value={form[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} required />
            </React.Fragment>
          ))}
          <button type="submit" style={btn}>✅ Criar Conta</button>
        </form>
        <p style={footer}>Já tem conta? <Link to="/login" style={{ color: '#1677ff' }}>Entrar</Link></p>
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
const btn = { background: '#52c41a', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8 };
const footer = { textAlign: 'center', marginTop: 20, fontSize: 14, color: '#666' };

/**
 * test_tournaments.js
 * Teste de integração: cria todos os tipos de torneio, cadastra teste1-8,
 * inscreve todos em cada torneio e gera as partidas.
 *
 * Uso: docker-compose exec backend node test_tournaments.js
 */

const http = require('http');

const HOST = 'localhost';
const PORT = 3001;
const BASE = '/api';

const TYPES = ['single_elimination', 'double_elimination', 'swiss', 'round_robin', 'draft', 'sealed', 'ladder'];
const TEST_USERS = Array.from({ length: 8 }, (_, i) => ({
  name: `Teste ${i + 1}`,
  email: `teste${i + 1}@test.com`,
  login: `teste${i + 1}`,
  password: 'teste123',
}));

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request({ host: HOST, port: PORT, path: BASE + path, method, headers }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) reject({ status: res.statusCode, data: json });
          else resolve(json);
        } catch { reject({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function step(label, fn) {
  try {
    const result = await fn();
    console.log(`  ✓ ${label}`);
    return result;
  } catch (e) {
    const msg = e?.data?.message || e?.message || JSON.stringify(e);
    console.log(`  ✗ ${label} — ${msg}`);
    return null;
  }
}

async function run() {
  console.log('\n=== CONNECT-PLAY — Teste de Torneios ===\n');

  // 1. Login admin
  console.log('1. Autenticando admin...');
  const adminRes = await step('login admin', () => request('POST', '/auth/login', { login: 'admin', password: 'admin123' }));
  if (!adminRes) return console.log('\n[ERRO] Admin não encontrado. Execute: docker-compose exec backend npm run seed');
  const adminToken = adminRes.token;

  // 2. Cadastrar teste1-8
  console.log('\n2. Cadastrando usuários teste1 a teste8...');
  const userIds = [];
  for (const u of TEST_USERS) {
    const res = await step(`cadastrar ${u.login}`, () => request('POST', '/auth/register', u));
    if (res) userIds.push(res.id);
  }

  // 3. Se algum já existia, busca via /users
  if (userIds.length < 8) {
    console.log('  → Buscando IDs de usuários já existentes...');
    try {
      const users = await request('GET', '/users', null, adminToken);
      userIds.length = 0;
      for (const u of TEST_USERS) {
        const found = users.find(x => x.login === u.login);
        if (found) userIds.push(found._id);
      }
      console.log(`  → ${userIds.length} usuários encontrados`);
    } catch (e) {
      console.log('  ✗ Erro ao buscar usuários:', e?.data?.message || e?.message);
    }
  }

  // 4. Criar um torneio de cada tipo
  console.log('\n3. Criando torneios...');
  const tournamentIds = [];
  for (const type of TYPES) {
    const res = await step(`criar torneio ${type}`, () =>
      request('POST', '/tournaments', {
        name: `Torneio ${type}`,
        type,
        startDate: '2025-09-01',
        endDate: '2025-09-07',
        maxParticipants: 8,
      }, adminToken)
    );
    if (res) tournamentIds.push({ id: res._id, type });
  }

  // 5. Inscrever todos os usuários em cada torneio
  console.log('\n4. Inscrevendo teste1-8 em cada torneio...');
  for (const t of tournamentIds) {
    let ok = 0;
    for (const uid of userIds) {
      const res = await step(`  ${t.type} ← ${uid}`, () =>
        request('POST', `/tournaments/${t.id}/participants`, { userId: uid }, adminToken)
      );
      if (res) ok++;
    }
    console.log(`  → ${t.type}: ${ok}/${userIds.length} inscritos`);
  }

  // 6. Gerar partidas
  console.log('\n5. Gerando partidas...');
  for (const t of tournamentIds) {
    await step(`gerar partidas ${t.type}`, () =>
      request('POST', `/matches/generate/${t.id}`, {}, adminToken)
    );
  }

  // 7. Verificar partidas criadas
  console.log('\n6. Verificando partidas criadas...');
  for (const t of tournamentIds) {
    try {
      const matches = await request('GET', `/matches/tournament/${t.id}`, null, adminToken);
      console.log(`  ✓ ${t.type}: ${matches.length} partida(s)`);
    } catch {
      console.log(`  ✗ ${t.type}: erro ao buscar partidas`);
    }
  }

  console.log('\n=== Teste concluído ===\n');
}

run().catch(e => console.error('Erro fatal:', e));

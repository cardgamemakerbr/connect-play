const router = require('express').Router();
const Match = require('../models/Match');
const auth = require('../middlewares/auth');
const { publish } = require('../services/rabbitmq');
const { notify } = require('../services/notifications');

// Calcula tabela de pontos de um torneio
async function calcPoints(tournamentId, participants) {
  const allMatches = await Match.find({ tournament: tournamentId, status: 'completed' });
  const points = {};
  const wins = {};
  const draws = {};
  const losses = {};
  participants.forEach(p => {
    const k = String(p);
    points[k] = 0; wins[k] = 0; draws[k] = 0; losses[k] = 0;
  });
  allMatches.forEach(m => {
    if (m.draw) {
      points[String(m.playerA)] = (points[String(m.playerA)] || 0) + 1;
      points[String(m.playerB)] = (points[String(m.playerB)] || 0) + 1;
      draws[String(m.playerA)] = (draws[String(m.playerA)] || 0) + 1;
      draws[String(m.playerB)] = (draws[String(m.playerB)] || 0) + 1;
    } else if (m.winner) {
      const loserId = String(m.playerA) === String(m.winner) ? String(m.playerB) : String(m.playerA);
      points[String(m.winner)] = (points[String(m.winner)] || 0) + 3;
      wins[String(m.winner)] = (wins[String(m.winner)] || 0) + 1;
      losses[loserId] = (losses[loserId] || 0) + 1;
    }
  });
  return { points, wins, draws, losses };
}

router.get('/tournament/:tournamentId', auth(), async (req, res) => {
  const Tournament = require('../models/Tournament');
  const matches = await Match.find({ tournament: req.params.tournamentId })
    .populate('playerA playerB winner', 'name login')
    .sort({ round: 1, bracket: 1 });

  const tournament = await Tournament.findById(req.params.tournamentId)
    .populate('participants', 'name login')
    .populate('ladder_ranking', 'name login');

  // Inclui tabela de pontos para swiss, round_robin e ladder
  let scoreboard = null;
  if (tournament && ['swiss', 'round_robin', 'ladder'].includes(tournament.type)) {
    const { points, wins, draws, losses } = await calcPoints(req.params.tournamentId, tournament.participants);
    scoreboard = tournament.participants.map(p => ({
      _id: p._id,
      login: p.login,
      name: p.name,
      points: points[String(p._id)] || 0,
      wins: wins[String(p._id)] || 0,
      draws: draws[String(p._id)] || 0,
      losses: losses[String(p._id)] || 0,
    })).sort((a, b) => b.points - a.points);
  }

  res.json({ matches, scoreboard, tournament });
});

router.post('/', auth(['admin', 'organizer']), async (req, res) => {
  const match = await Match.create(req.body);
  await publish('match.scheduled', { matchId: match._id, ...req.body });
  res.status(201).json(match);
});

// Registrar resultado (com suporte a empate) e avançar etapas
router.put('/:id/result', auth(['admin', 'organizer']), async (req, res) => {
  const Tournament = require('../models/Tournament');

  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ message: 'Match not found' });
  if (match.status === 'completed') return res.status(400).json({ message: 'Partida já finalizada' });

  const isDraw = req.body.draw === true;
  const winnerId = isDraw ? null : req.body.winner;
  const loserId = isDraw ? null : (String(match.playerA) === String(winnerId) ? String(match.playerB) : String(match.playerA));

  match.winner = winnerId || undefined;
  match.draw = isDraw;
  match.status = 'completed';
  await match.save();
  await publish('match.result', { matchId: match._id, winner: winnerId, draw: isDraw });

  // Notifica os dois jogadores sobre o resultado
  const tournament = await Tournament.findById(match.tournament);
  const resultText = isDraw ? 'Empate!' : `Vencedor: ${winnerId}`;
  await notify(
    [String(match.playerA), String(match.playerB)],
    'result',
    '⚔️ Resultado registrado',
    `Uma partida do torneio "${tournament.name}" foi finalizada. ${isDraw ? '🤝 Empate!' : '🏆 Resultado disponível!'}`,
    `/tournaments/${tournament._id}/matches`
  );

  const type = tournament.type;

  // ── SINGLE ELIMINATION / DRAFT / SEALED ─────────────────────────────────────
  if (type === 'single_elimination' || type === 'draft' || type === 'sealed') {
    const roundMatches = await Match.find({ tournament: match.tournament, round: match.round });
    if (roundMatches.every(m => m.status === 'completed')) {
      const winners = roundMatches.map(m => String(m.winner));
      if (winners.length === 1) {
        await Tournament.findByIdAndUpdate(match.tournament, { status: 'closed' });
      } else {
        const nextRound = match.round + 1;
        const nextMatches = [];
        for (let i = 0; i < winners.length; i += 2)
          nextMatches.push({ tournament: match.tournament, playerA: winners[i], playerB: winners[i + 1], round: nextRound, bracket: 'winners' });
        const created = await Match.insertMany(nextMatches);
        for (const m of created)
          await publish('match.scheduled', { matchId: m._id, tournament: m.tournament, playerA: m.playerA, playerB: m.playerB, round: m.round });
      }
    }
  }

  // ── DOUBLE ELIMINATION ───────────────────────────────────────────────────────
  else if (type === 'double_elimination') {
    if (match.bracket === 'winners' && loserId) {
      const existingLosers = await Match.find({ tournament: match.tournament, bracket: 'losers' });
      const losersRound = existingLosers.length > 0 ? Math.max(...existingLosers.map(m => m.round)) : match.round;
      const unpaired = existingLosers.find(m => m.status === 'scheduled' && (!m.playerB || String(m.playerB) === String(m.playerA)));
      if (unpaired) {
        unpaired.playerB = loserId;
        await unpaired.save();
      } else {
        await Match.create({ tournament: match.tournament, playerA: loserId, playerB: loserId, round: losersRound + 1, bracket: 'losers' });
      }
    }

    const roundWinners = await Match.find({ tournament: match.tournament, round: match.round, bracket: 'winners' });
    const roundLosers = await Match.find({ tournament: match.tournament, round: match.round, bracket: 'losers' });
    const allDone = [...roundWinners, ...roundLosers].every(m => m.status === 'completed');

    if (allDone) {
      const ww = roundWinners.map(m => String(m.winner)).filter(Boolean);
      const lw = roundLosers.map(m => String(m.winner)).filter(Boolean);
      if (ww.length === 1 && lw.length === 1) {
        const gf = await Match.findOne({ tournament: match.tournament, bracket: 'grand_final' });
        if (!gf)
          await Match.create({ tournament: match.tournament, playerA: ww[0], playerB: lw[0], round: match.round + 1, bracket: 'grand_final' });
      } else if (ww.length > 1) {
        const nextRound = match.round + 1;
        for (let i = 0; i < ww.length - 1; i += 2)
          await Match.create({ tournament: match.tournament, playerA: ww[i], playerB: ww[i + 1], round: nextRound, bracket: 'winners' });
      }
    }

    if (match.bracket === 'grand_final')
      await Tournament.findByIdAndUpdate(match.tournament, { status: 'closed' });
  }

  // ── SWISS ────────────────────────────────────────────────────────────────────
  else if (type === 'swiss') {
    const roundMatches = await Match.find({ tournament: match.tournament, round: match.round });
    if (roundMatches.every(m => m.status === 'completed')) {
      const maxRounds = tournament.swiss_rounds || Math.ceil(Math.log2(tournament.participants.length));
      if (match.round >= maxRounds) {
        // Torneio encerrado — tabela final calculada no GET
        await Tournament.findByIdAndUpdate(match.tournament, { status: 'closed' });
      } else {
        const allMatches = await Match.find({ tournament: match.tournament, status: 'completed' });
        const { points } = await calcPoints(match.tournament, tournament.participants);
        const played = new Set(allMatches.map(m => [String(m.playerA), String(m.playerB)].sort().join('|')));
        const sorted = Object.entries(points).sort((a, b) => b[1] - a[1]).map(e => e[0]);

        const nextRound = match.round + 1;
        const paired = new Set();
        const nextMatches = [];
        for (let i = 0; i < sorted.length; i++) {
          if (paired.has(sorted[i])) continue;
          for (let j = i + 1; j < sorted.length; j++) {
            if (paired.has(sorted[j])) continue;
            const key = [sorted[i], sorted[j]].sort().join('|');
            if (!played.has(key)) {
              nextMatches.push({ tournament: match.tournament, playerA: sorted[i], playerB: sorted[j], round: nextRound });
              paired.add(sorted[i]);
              paired.add(sorted[j]);
              break;
            }
          }
        }
        if (nextMatches.length > 0) {
          const created = await Match.insertMany(nextMatches);
          for (const m of created)
            await publish('match.scheduled', { matchId: m._id, tournament: m.tournament, playerA: m.playerA, playerB: m.playerB, round: m.round });
        }
      }
    }
  }

  // ── ROUND ROBIN ──────────────────────────────────────────────────────────────
  else if (type === 'round_robin') {
    const allMatches = await Match.find({ tournament: match.tournament });
    const allDone = allMatches.length > 0 && allMatches.every(m => m.status === 'completed');
    if (allDone)
      await Tournament.findByIdAndUpdate(match.tournament, { status: 'closed' });
  }

  // ── LADDER ───────────────────────────────────────────────────────────────────
  else if (type === 'ladder') {
    // Atualiza ranking (empate não muda posições)
    const ranking = tournament.ladder_ranking.map(String);
    if (!isDraw && winnerId && loserId) {
      const winnerPos = ranking.indexOf(String(winnerId));
      const loserPos = ranking.indexOf(String(loserId));
      if (winnerPos > loserPos) {
        ranking[winnerPos] = String(loserId);
        ranking[loserPos] = String(winnerId);
        tournament.ladder_ranking = ranking;
        await tournament.save();
      }
    }

    // Recarrega o torneio para garantir ladder_max_rounds atualizado
    const freshTournament = await Tournament.findById(match.tournament);
    const maxRounds = Math.max(4, freshTournament.ladder_max_rounds || 4);

    // Ao completar toda a rodada, verifica se atingiu o máximo de rodadas
    const roundMatches = await Match.find({ tournament: match.tournament, round: match.round });
    if (roundMatches.every(m => m.status === 'completed')) {
      if (match.round >= maxRounds) {
        await Tournament.findByIdAndUpdate(match.tournament, { status: 'closed' });
      } else {
        const updatedRanking = freshTournament.ladder_ranking.map(String);
        const nextRound = match.round + 1;
        const nextMatches = [];
        const offset = (match.round % 2 === 0) ? 0 : 1;
        for (let i = offset; i < updatedRanking.length - 1; i += 2)
          nextMatches.push({ tournament: match.tournament, playerA: updatedRanking[i], playerB: updatedRanking[i + 1], round: nextRound });
        if (nextMatches.length > 0) {
          const created = await Match.insertMany(nextMatches);
          for (const m of created)
            await publish('match.scheduled', { matchId: m._id, tournament: m.tournament, playerA: m.playerA, playerB: m.playerB, round: m.round });
        }
      }
    }
  }

  const updated = await Match.findById(match._id).populate('playerA playerB winner', 'name login');
  res.json(updated);
});

// Gerar partidas automaticamente conforme o tipo do torneio
router.post('/generate/:tournamentId', auth(['admin', 'organizer']), async (req, res) => {
  const Tournament = require('../models/Tournament');
  const tournament = await Tournament.findById(req.params.tournamentId);
  if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

  const players = [...tournament.participants];
  if (players.length < 2) return res.status(400).json({ message: 'Mínimo de 2 participantes necessário' });

  const type = tournament.type;
  const matches = [];
  const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);

  const existing = await Match.findOne({ tournament: tournament._id, round: 1 });
  if (existing) return res.status(400).json({ message: 'Partidas já foram geradas para este torneio' });

  if (type === 'single_elimination' || type === 'draft' || type === 'sealed') {
    const isPow2 = n => n > 0 && (n & (n - 1)) === 0;
    if (!isPow2(players.length))
      return res.status(400).json({ message: `${type} requer número de participantes em potência de 2 (ex: 2, 4, 8, 16). Atual: ${players.length}` });
    const seeded = shuffle(players);
    for (let i = 0; i < seeded.length; i += 2)
      matches.push({ tournament: tournament._id, playerA: seeded[i], playerB: seeded[i + 1], round: 1, bracket: 'winners' });

  } else if (type === 'double_elimination') {
    const seeded = shuffle(players);
    for (let i = 0; i < seeded.length - 1; i += 2)
      matches.push({ tournament: tournament._id, playerA: seeded[i], playerB: seeded[i + 1], round: 1, bracket: 'winners' });

  } else if (type === 'swiss') {
    // Define número de rodadas: ceil(log2(n))
    const swissRounds = Math.ceil(Math.log2(players.length));
    await Tournament.findByIdAndUpdate(tournament._id, { swiss_rounds: swissRounds });
    const seeded = shuffle(players);
    for (let i = 0; i < seeded.length - 1; i += 2)
      matches.push({ tournament: tournament._id, playerA: seeded[i], playerB: seeded[i + 1], round: 1 });

  } else if (type === 'round_robin') {
    // Algoritmo circle method — gera rodadas balanceadas
    const n = players.length;
    const rounds = n % 2 === 0 ? n - 1 : n;
    const list = [...players];
    if (n % 2 !== 0) list.push(null); // bye
    const half = list.length / 2;
    for (let r = 0; r < rounds; r++) {
      for (let i = 0; i < half; i++) {
        const a = list[i];
        const b = list[list.length - 1 - i];
        if (a && b) matches.push({ tournament: tournament._id, playerA: a, playerB: b, round: r + 1 });
      }
      list.splice(1, 0, list.pop());
    }

  } else if (type === 'ladder') {
    // ladder_max_rounds já foi salvo na criação do torneio — usa o valor existente (mínimo 4)
    const maxRounds = Math.max(4, tournament.ladder_max_rounds || 4);
    tournament.ladder_ranking = [...players];
    tournament.ladder_max_rounds = maxRounds;
    await tournament.save();
    for (let i = 0; i < players.length - 1; i += 2)
      matches.push({ tournament: tournament._id, playerA: players[i], playerB: players[i + 1], round: 1 });
  }

  if (matches.length === 0)
    return res.status(400).json({ message: 'Não foi possível gerar partidas para este formato' });

  await Tournament.findByIdAndUpdate(tournament._id, { status: 'ongoing' });

  // Notifica todos os participantes que as partidas foram geradas
  await notify(
    players.map(String),
    'match',
    '⚔️ Partidas geradas!',
    `As partidas do torneio "${tournament.name}" foram geradas. Confira seu confronto!`,
    `/tournaments/${tournament._id}/matches`
  );

  const created = await Match.insertMany(matches);
  for (const m of created)
    await publish('match.scheduled', { matchId: m._id, tournament: m.tournament, playerA: m.playerA, playerB: m.playerB, round: m.round });

  res.status(201).json(created);
});

module.exports = router;

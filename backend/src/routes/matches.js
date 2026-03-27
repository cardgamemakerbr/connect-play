const router = require('express').Router();
const Match = require('../models/Match');
const auth = require('../middlewares/auth');
const { publish } = require('../services/rabbitmq');

router.get('/tournament/:tournamentId', auth(), async (req, res) => {
  const matches = await Match.find({ tournament: req.params.tournamentId })
    .populate('playerA playerB winner', 'name login')
    .sort({ round: 1, bracket: 1 });
  res.json(matches);
});

router.post('/', auth(['admin', 'organizer']), async (req, res) => {
  const match = await Match.create(req.body);
  await publish('match.scheduled', { matchId: match._id, ...req.body });
  res.status(201).json(match);
});

// Registrar resultado e avançar etapas automaticamente
router.put('/:id/result', auth(['admin', 'organizer']), async (req, res) => {
  const Tournament = require('../models/Tournament');

  const match = await Match.findById(req.params.id);
  if (!match) return res.status(404).json({ message: 'Match not found' });
  if (match.status === 'completed') return res.status(400).json({ message: 'Partida já finalizada' });

  const winnerId = req.body.winner;
  const loserId = String(match.playerA) === String(winnerId)
    ? String(match.playerB)
    : String(match.playerA);

  match.winner = winnerId;
  match.status = 'completed';
  await match.save();
  await publish('match.result', { matchId: match._id, winner: winnerId });

  const tournament = await Tournament.findById(match.tournament);
  const type = tournament.type;

  // ── SINGLE ELIMINATION ──────────────────────────────────────────────────────
  if (type === 'single_elimination' || type === 'draft' || type === 'sealed') {
    const roundMatches = await Match.find({ tournament: match.tournament, round: match.round });
    const allDone = roundMatches.every(m => m.status === 'completed');

    if (allDone) {
      const winners = roundMatches.map(m => String(m.winner));
      if (winners.length === 1) {
        // Campeão definido — fecha torneio
        await Tournament.findByIdAndUpdate(match.tournament, { status: 'closed' });
      } else {
        // Gera próxima rodada com os vencedores
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

  // ── DOUBLE ELIMINATION ──────────────────────────────────────────────────────
  else if (type === 'double_elimination') {
    const roundWinnersMatches = await Match.find({ tournament: match.tournament, round: match.round, bracket: 'winners' });
    const roundLosersMatches = await Match.find({ tournament: match.tournament, round: match.round, bracket: 'losers' });
    const allWinnersDone = roundWinnersMatches.every(m => m.status === 'completed');
    const allLosersDone = roundLosersMatches.length === 0 || roundLosersMatches.every(m => m.status === 'completed');

    if (match.bracket === 'winners') {
      // Perdedor vai para chave de perdedores
      const existingLosers = await Match.find({ tournament: match.tournament, bracket: 'losers' });
      const losersRound = existingLosers.length > 0 ? Math.max(...existingLosers.map(m => m.round)) + 1 : match.round;

      // Verifica se há outro perdedor aguardando na chave losers sem par
      const pendingLoser = await Match.findOne({
        tournament: match.tournament,
        bracket: 'losers',
        status: 'scheduled',
        playerB: null,
      });

      if (pendingLoser) {
        pendingLoser.playerB = loserId;
        await pendingLoser.save();
      } else {
        // Cria slot aguardando próximo perdedor (playerB será preenchido depois)
        // Para simplificar: se já há perdedores suficientes, emparelha imediatamente
        const losersPending = await Match.find({ tournament: match.tournament, bracket: 'losers', status: 'scheduled' });
        const unpaired = losersPending.find(m => !m.playerB || String(m.playerB) === String(m.playerA));
        if (unpaired) {
          unpaired.playerB = loserId;
          await unpaired.save();
        } else {
          await Match.create({ tournament: match.tournament, playerA: loserId, playerB: loserId, round: losersRound, bracket: 'losers' });
        }
      }
    }

    if (allWinnersDone && allLosersDone) {
      const winnersWinners = roundWinnersMatches.map(m => String(m.winner));
      const losersWinners = roundLosersMatches.map(m => String(m.winner));

      if (winnersWinners.length === 1 && losersWinners.length === 1) {
        // Grand Final
        const gf = await Match.findOne({ tournament: match.tournament, bracket: 'grand_final' });
        if (!gf) {
          await Match.create({ tournament: match.tournament, playerA: winnersWinners[0], playerB: losersWinners[0], round: match.round + 1, bracket: 'grand_final' });
        }
      } else {
        // Próxima rodada winners
        const nextRound = match.round + 1;
        for (let i = 0; i < winnersWinners.length - 1; i += 2)
          await Match.create({ tournament: match.tournament, playerA: winnersWinners[i], playerB: winnersWinners[i + 1], round: nextRound, bracket: 'winners' });
      }
    }

    // Grand final concluída
    if (match.bracket === 'grand_final') {
      await Tournament.findByIdAndUpdate(match.tournament, { status: 'closed' });
    }
  }

  // ── SWISS ───────────────────────────────────────────────────────────────────
  else if (type === 'swiss') {
    const roundMatches = await Match.find({ tournament: match.tournament, round: match.round });
    const allDone = roundMatches.every(m => m.status === 'completed');

    if (allDone) {
      // Calcula pontuação: vitória = 3pts, empate não existe aqui
      const allMatches = await Match.find({ tournament: match.tournament, status: 'completed' });
      const points = {};
      tournament.participants.forEach(p => { points[String(p)] = 0; });
      allMatches.forEach(m => { if (m.winner) points[String(m.winner)] = (points[String(m.winner)] || 0) + 3; });

      // Ordena por pontuação e emparelha adjacentes (sem repetir confrontos)
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

  // ── LADDER ──────────────────────────────────────────────────────────────────
  else if (type === 'ladder') {
    // Inicializa ranking se vazio
    if (!tournament.ladder_ranking || tournament.ladder_ranking.length === 0) {
      tournament.ladder_ranking = [...tournament.participants];
      await tournament.save();
    }

    const ranking = tournament.ladder_ranking.map(String);
    const winnerPos = ranking.indexOf(String(winnerId));
    const loserPos = ranking.indexOf(String(loserId));

    // Se vencedor estava abaixo do perdedor, troca posições
    if (winnerPos > loserPos) {
      ranking[winnerPos] = String(loserId);
      ranking[loserPos] = String(winnerId);
      tournament.ladder_ranking = ranking;
      await tournament.save();
    }
  }

  // ── ROUND ROBIN ─────────────────────────────────────────────────────────────
  // Round robin não gera novas etapas — todas as partidas já foram criadas de uma vez.
  // Ao completar todas, fecha o torneio.
  else if (type === 'round_robin') {
    const allMatches = await Match.find({ tournament: match.tournament });
    if (allMatches.every(m => m.status === 'completed')) {
      await Tournament.findByIdAndUpdate(match.tournament, { status: 'closed' });
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
    const seeded = shuffle(players);
    for (let i = 0; i < seeded.length - 1; i += 2)
      matches.push({ tournament: tournament._id, playerA: seeded[i], playerB: seeded[i + 1], round: 1 });

  } else if (type === 'round_robin') {
    for (let i = 0; i < players.length; i++)
      for (let j = i + 1; j < players.length; j++)
        matches.push({ tournament: tournament._id, playerA: players[i], playerB: players[j], round: 1 });

  } else if (type === 'ladder') {
    // Inicializa ranking e cria partidas da rodada 1
    tournament.ladder_ranking = [...players];
    await tournament.save();
    for (let i = 0; i < players.length - 1; i += 2)
      matches.push({ tournament: tournament._id, playerA: players[i], playerB: players[i + 1], round: 1 });
  }

  if (matches.length === 0)
    return res.status(400).json({ message: 'Não foi possível gerar partidas para este formato' });

  // Muda status do torneio para ongoing
  await Tournament.findByIdAndUpdate(tournament._id, { status: 'ongoing' });

  const created = await Match.insertMany(matches);
  for (const m of created)
    await publish('match.scheduled', { matchId: m._id, tournament: m.tournament, playerA: m.playerA, playerB: m.playerB, round: m.round });

  res.status(201).json(created);
});

module.exports = router;

const router = require('express').Router();
const Match = require('../models/Match');
const auth = require('../middlewares/auth');
const { publish } = require('../services/rabbitmq');

router.get('/tournament/:tournamentId', auth(), async (req, res) => {
  const matches = await Match.find({ tournament: req.params.tournamentId })
    .populate('playerA playerB winner', 'name login');
  res.json(matches);
});

router.post('/', auth(['admin', 'organizer']), async (req, res) => {
  const match = await Match.create(req.body);
  await publish('match.scheduled', { matchId: match._id, ...req.body });
  res.status(201).json(match);
});

router.put('/:id/result', auth(['admin', 'organizer']), async (req, res) => {
  const match = await Match.findByIdAndUpdate(
    req.params.id,
    { winner: req.body.winner, status: 'completed' },
    { new: true }
  );
  await publish('match.result', { matchId: match._id, winner: req.body.winner });
  res.json(match);
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
  const shuffle = arr => arr.sort(() => Math.random() - 0.5);

  // Verifica se já existem partidas na rodada 1
  const existing = await Match.findOne({ tournament: tournament._id, round: 1 });
  if (existing) return res.status(400).json({ message: 'Partidas já foram geradas para este torneio' });

  if (type === 'single_elimination') {
    // Requer potência de 2
    const isPow2 = n => n > 0 && (n & (n - 1)) === 0;
    if (!isPow2(players.length))
      return res.status(400).json({ message: `Single elimination requer número de participantes em potência de 2 (ex: 2, 4, 8, 16). Atual: ${players.length}` });
    const seeded = shuffle(players);
    for (let i = 0; i < seeded.length; i += 2)
      matches.push({ tournament: tournament._id, playerA: seeded[i], playerB: seeded[i + 1], round: 1 });

  } else if (type === 'double_elimination') {
    // Mesma lógica do single para rodada 1; perdedores vão para chave de perdedores (gerenciado manualmente)
    if (players.length < 2)
      return res.status(400).json({ message: 'Double elimination requer ao menos 2 participantes' });
    const seeded = shuffle(players);
    for (let i = 0; i < seeded.length - 1; i += 2)
      matches.push({ tournament: tournament._id, playerA: seeded[i], playerB: seeded[i + 1], round: 1 });

  } else if (type === 'swiss') {
    // Número par recomendado; se ímpar, um jogador recebe bye (folga)
    const seeded = shuffle(players);
    for (let i = 0; i < seeded.length - 1; i += 2)
      matches.push({ tournament: tournament._id, playerA: seeded[i], playerB: seeded[i + 1], round: 1 });
    // Se ímpar, último jogador recebe bye (partida sem oponente não é criada)

  } else if (type === 'round_robin') {
    // Todos contra todos em rodada única
    for (let i = 0; i < players.length; i++)
      for (let j = i + 1; j < players.length; j++)
        matches.push({ tournament: tournament._id, playerA: players[i], playerB: players[j], round: 1 });

  } else if (type === 'draft' || type === 'sealed') {
    // Emparelhamento aleatório; draft/sealed são formatos de construção, as partidas seguem chaveamento simples
    const seeded = shuffle(players);
    for (let i = 0; i < seeded.length - 1; i += 2)
      matches.push({ tournament: tournament._id, playerA: seeded[i], playerB: seeded[i + 1], round: 1 });

  } else if (type === 'ladder') {
    // Ladder: emparelha jogadores adjacentes no ranking (posição 1 vs 2, 3 vs 4, ...)
    for (let i = 0; i < players.length - 1; i += 2)
      matches.push({ tournament: tournament._id, playerA: players[i], playerB: players[i + 1], round: 1 });
  }

  if (matches.length === 0)
    return res.status(400).json({ message: 'Não foi possível gerar partidas para este formato' });

  const created = await Match.insertMany(matches);
  for (const m of created)
    await publish('match.scheduled', { matchId: m._id, tournament: m.tournament, playerA: m.playerA, playerB: m.playerB, round: m.round });

  res.status(201).json(created);
});

module.exports = router;

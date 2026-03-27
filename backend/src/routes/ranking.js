const router = require('express').Router();
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const auth = require('../middlewares/auth');

// Pontos por posição no ranking de cada torneio
const RANK_POINTS = { 1: 5, 2: 4, 3: 3, 4: 2, 5: 1 };

router.get('/', auth(), async (req, res) => {
  const closedTournaments = await Tournament.find({ status: 'closed' });

  const playerPoints = {}; // { userId: { points, gold, silver, bronze, tournaments } }

  for (const t of closedTournaments) {
    const matches = await Match.find({ tournament: t._id, status: 'completed' });
    if (!matches.length) continue;

    // Calcula pontuação de cada participante no torneio
    const pts = {};
    t.participants.forEach(p => { pts[String(p)] = 0; });

    matches.forEach(m => {
      if (m.draw) {
        pts[String(m.playerA)] = (pts[String(m.playerA)] || 0) + 1;
        pts[String(m.playerB)] = (pts[String(m.playerB)] || 0) + 1;
      } else if (m.winner) {
        pts[String(m.winner)] = (pts[String(m.winner)] || 0) + 3;
      }
    });

    // Ordena por pontuação e atribui pontos de ranking (1º=5pts, 2º=4pts, ...)
    const sorted = Object.entries(pts).sort((a, b) => b[1] - a[1]);
    sorted.forEach(([userId], idx) => {
      const pos = idx + 1;
      const rankPts = RANK_POINTS[pos] || 0;
      if (!playerPoints[userId]) playerPoints[userId] = { points: 0, gold: 0, silver: 0, bronze: 0, tournaments: 0 };
      playerPoints[userId].points += rankPts;
      playerPoints[userId].tournaments += 1;
      if (pos === 1) playerPoints[userId].gold += 1;
      if (pos === 2) playerPoints[userId].silver += 1;
      if (pos === 3) playerPoints[userId].bronze += 1;
    });
  }

  // Busca dados dos jogadores
  const userIds = Object.keys(playerPoints);
  const users = await User.find({ _id: { $in: userIds } }).select('name login');

  const ranking = users.map(u => ({
    _id: u._id,
    login: u.login,
    name: u.name,
    ...playerPoints[String(u._id)],
  })).sort((a, b) => b.points - a.points || b.gold - a.gold);

  res.json(ranking);
});

module.exports = router;

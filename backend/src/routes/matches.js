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

module.exports = router;

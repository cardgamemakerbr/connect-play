const router = require('express').Router();
const Tournament = require('../models/Tournament');
const auth = require('../middlewares/auth');
const { notify } = require('../services/notifications');

router.get('/', async (req, res) => {
  const tournaments = await Tournament.find()
    .populate('organizer', 'name')
    .populate('participants', 'name login')
    .populate('ladder_ranking', 'name login');
  res.json(tournaments);
});

router.post('/', auth(['admin', 'organizer']), async (req, res) => {
  try {
    const tournament = await Tournament.create({ ...req.body, organizer: req.user.id });
    // Notifica todos os usuários sobre o novo torneio
    const User = require('../models/User');
    const users = await User.find({}, '_id');
    await notify(users.map(u => u._id), 'tournament', '🏆 Novo torneio disponível!', `O torneio "${tournament.name}" (${tournament.type}) está aberto para inscrições!`, '/tournaments');
    res.status(201).json(tournament);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.put('/:id', auth(['admin', 'organizer']), async (req, res) => {
  const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(tournament);
});

router.delete('/:id', auth(['admin']), async (req, res) => {
  await Tournament.findByIdAndDelete(req.params.id);
  res.json({ message: 'Tournament deleted' });
});

// Inscrição
router.post('/:id/join', auth(), async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
  if (tournament.status !== 'open') return res.status(400).json({ message: 'Tournament not open' });
  if (tournament.participants.includes(req.user.id))
    return res.status(400).json({ message: 'Already registered' });
  if (tournament.maxParticipants && tournament.participants.length >= tournament.maxParticipants)
    return res.status(400).json({ message: 'Tournament full' });
  tournament.participants.push(req.user.id);
  await tournament.save();
  res.json({ message: 'Registered successfully' });
});

// Adicionar participante (admin/organizer)
router.post('/:id/participants', auth(['admin', 'organizer']), async (req, res) => {
  const { userId } = req.body;
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
  if (tournament.participants.map(String).includes(String(userId)))
    return res.status(400).json({ message: 'Already registered' });
  if (tournament.maxParticipants && tournament.participants.length >= tournament.maxParticipants)
    return res.status(400).json({ message: 'Tournament full' });
  tournament.participants.push(userId);
  await tournament.save();
  res.json({ message: 'Participant added' });
});

// Remover participante (admin/organizer)
router.delete('/:id/participants/:userId', auth(['admin', 'organizer']), async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
  tournament.participants = tournament.participants.filter(p => String(p) !== req.params.userId);
  await tournament.save();
  res.json({ message: 'Participant removed' });
});

module.exports = router;

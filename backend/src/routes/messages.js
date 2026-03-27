const router = require('express').Router();
const Message = require('../models/Message');
const auth = require('../middlewares/auth');

router.get('/tournament/:tournamentId', auth(), async (req, res) => {
  const messages = await Message.find({ tournament: req.params.tournamentId })
    .populate('from to', 'name login');
  res.json(messages);
});

router.post('/', auth(), async (req, res) => {
  const message = await Message.create({ ...req.body, from: req.user.id });
  res.status(201).json(message);
});

module.exports = router;

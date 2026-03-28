const router = require('express').Router();
const User = require('../models/User');
const auth = require('../middlewares/auth');

router.get('/', auth(['admin']), async (req, res) => {
  const users = await User.find().select('-password');
  res.json(users);
});

router.put('/:id/role', auth(['admin']), async (req, res) => {
  const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true }).select('-password');
  res.json(user);
});

router.delete('/:id', auth(['admin']), async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

router.get('/me', auth(), async (req, res) => {
  const user = await User.findById(req.user.id).select('-password').populate({
    path: 'trophies',
    populate: { path: 'tournament', select: 'name type' },
  });
  res.json(user);
});

module.exports = router;

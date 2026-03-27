const router = require('express').Router();
const Notification = require('../models/Notification');
const auth = require('../middlewares/auth');

// Lista notificações do usuário logado (mais recentes primeiro)
router.get('/', auth(), async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(50);
  res.json(notifications);
});

// Marcar uma como lida
router.put('/:id/read', auth(), async (req, res) => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { read: true });
  res.json({ ok: true });
});

// Marcar todas como lidas
router.put('/read-all', auth(), async (req, res) => {
  await Notification.updateMany({ user: req.user.id, read: false }, { read: true });
  res.json({ ok: true });
});

module.exports = router;

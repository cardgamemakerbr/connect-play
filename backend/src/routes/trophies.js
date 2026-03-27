const router = require('express').Router();
const Trophy = require('../models/Trophy');
const User = require('../models/User');
const auth = require('../middlewares/auth');

router.get('/', auth(), async (req, res) => {
  const trophies = await Trophy.find().populate('awardedTo tournament', 'name');
  res.json(trophies);
});

router.post('/', auth(['admin', 'organizer']), async (req, res) => {
  const trophy = await Trophy.create(req.body);
  if (req.body.awardedTo) {
    await User.findByIdAndUpdate(req.body.awardedTo, { $push: { trophies: trophy._id } });
  }
  res.status(201).json(trophy);
});

router.delete('/:id', auth(['admin']), async (req, res) => {
  await Trophy.findByIdAndDelete(req.params.id);
  res.json({ message: 'Trophy deleted' });
});

module.exports = router;

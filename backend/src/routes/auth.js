const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

router.post('/register', async (req, res) => {
  try {
    const { name, email, login, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, login, password: hash }); // role sempre 'player'
    res.status(201).json({ id: user._id, login: user.login, role: user.role });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { login, password } = req.body;
    const user = await User.findOne({ login });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, role: user.role });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;

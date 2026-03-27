const express = require('express');
const mongoose = require('mongoose');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tournamentRoutes = require('./routes/tournaments');
const matchRoutes = require('./routes/matches');
const messageRoutes = require('./routes/messages');
const trophyRoutes = require('./routes/trophies');
const notificationRoutes = require('./routes/notifications');
const rankingRoutes = require('./routes/ranking');

const app = express();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/trophies', trophyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/ranking', rankingRoutes);

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('MongoDB connected');
  app.listen(3001, () => console.log('Backend running on port 3001'));
});

const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  playerA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  playerB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scheduledAt: Date,
  round: Number,
  status: { type: String, enum: ['scheduled', 'completed'], default: 'scheduled' },
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);

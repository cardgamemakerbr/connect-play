const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  playerA: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  playerB: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  draw: { type: Boolean, default: false },
  scheduledAt: Date,
  round: Number,
  bracket: { type: String, enum: ['winners', 'losers', 'grand_final'], default: 'winners' },
  status: { type: String, enum: ['scheduled', 'completed'], default: 'scheduled' },
}, { timestamps: true });

module.exports = mongoose.model('Match', matchSchema);

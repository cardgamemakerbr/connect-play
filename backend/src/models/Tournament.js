const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: {
    type: String,
    enum: ['single_elimination', 'double_elimination', 'swiss', 'round_robin', 'draft', 'sealed', 'ladder'],
    required: true,
  },
  startDate: Date,
  endDate: Date,
  maxParticipants: Number,
  status: { type: String, enum: ['open', 'ongoing', 'closed'], default: 'open' },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  ladder_ranking: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  swiss_rounds: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Tournament', tournamentSchema);

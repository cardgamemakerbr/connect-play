const mongoose = require('mongoose');

const trophySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['trophy', 'medal'], default: 'trophy' },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
  awardedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Trophy', trophySchema);

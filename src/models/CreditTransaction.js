const mongoose = require('mongoose');

const creditTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['purchase', 'usage'], required: true },
    amount: { type: Number, required: true },
    description: { type: String },
    metadata: { type: Object }
  },
  { timestamps: true }
);

module.exports = mongoose.model('CreditTransaction', creditTransactionSchema);

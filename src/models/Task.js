const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['homework', 'pdf_summary', 'pdf_questions', 'presentation_text', 'presentation_generate', 'pdf_tool'],
      required: true
    },
    input: { type: Object },
    output: { type: Object },
    creditsUsed: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Task', taskSchema);

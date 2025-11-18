const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  credits: { type: Number, default: 50 },
  role: { type: String, default: "user" }, // admin / user
  banned: { type: Boolean, default: false },

  // Admin panel ayarları
  settings: {
    homework: { type: Boolean, default: true },
    pdfTools: { type: Boolean, default: true },
    presentations: { type: Boolean, default: true }
  },

  prompts: {
    homework: { type: String, default: "" },
    pdfSummary: { type: String, default: "" },
    pdfQuestions: { type: String, default: "" },
    pdfPresentation: { type: String, default: "" }
  }
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (pw) {
  return await bcrypt.compare(pw, this.password);
};

module.exports = mongoose.model("User", userSchema);

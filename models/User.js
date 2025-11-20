const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto"); // EKLENDİ: Token üretimi için gerekli

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true,
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      lowercase: true
    },
    password: { 
      type: String, 
      required: true 
    },
    
    // --- KREDİ AYARI ---
    credits: { 
      type: Number, 
      default: 10
    },
    
    // --- ROL ve DURUM ---
    role: { 
      type: String, 
      enum: ["user", "admin"],
      default: "user" 
    },
    banned: { 
      type: Boolean, 
      default: false 
    },

    // --- ADMIN PANEL / UYGULAMA AYARLARI ---
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
    },

    // --- EKLENDİ: ŞİFRE SIFIRLAMA ALANLARI ---
    resetPasswordToken: String,
    resetPasswordExpire: Date
  },
  {
    timestamps: true 
  }
);

// Şifre şifreleme (Aynen korundu)
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Şifre kontrolü (Aynen korundu)
userSchema.methods.matchPassword = async function (pw) {
  return await bcrypt.compare(pw, this.password);
};

// --- EKLENDİ: Şifre Sıfırlama Token Oluşturucu ---
userSchema.methods.getResetPasswordToken = function () {
  // 1. Rastgele bir token oluştur
  const resetToken = crypto.randomBytes(20).toString('hex');

  // 2. Token'ı hash'le ve veritabanına kaydet (Güvenlik için)
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3. Token süresini 10 dakika olarak ayarla
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", userSchema);
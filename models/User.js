const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { 
      type: String, 
      required: true, // İsimsiz kayıt olmasın
      trim: true 
    },
    email: { 
      type: String, 
      required: true, 
      unique: true, 
      trim: true,
      lowercase: true // E-postaları küçük harfe çevirir (Ahmet@... ile ahmet@... aynı sayılır)
    },
    password: { 
      type: String, 
      required: true 
    },
    
    // --- KREDİ AYARI ---
    credits: { 
      type: Number, 
      default: 20 // İSTEĞİN: Her yeni üyeye 20 kredi
    },
    
    // --- ROL ve DURUM ---
    role: { 
      type: String, 
      enum: ["user", "admin"], // Sadece bu iki değer girilebilir, güvenlik için.
      default: "user" 
    },
    banned: { 
      type: Boolean, 
      default: false 
    },

    // --- ADMIN PANEL / UYGULAMA AYARLARI ---
    // (Senin frontend yapınla tam uyumlu kısımlar)
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
  },
  {
    // Bu ayar otomatik olarak 'createdAt' (Kayıt Tarihi) ve 'updatedAt' ekler.
    // Admin panelinde "En son kayıt olanlar" listesi yapman için ŞARTTIR.
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

module.exports = mongoose.model("User", userSchema);
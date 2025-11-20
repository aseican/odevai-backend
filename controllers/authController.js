const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Token Üretici
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// --- KAYIT OL ---
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Lütfen tüm alanları doldurun" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Bu email zaten kayıtlı" });
    }

    const user = await User.create({ name, email, password });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: "Geçersiz kullanıcı verisi" });
    }
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası: " + error.message });
  }
};

// --- GİRİŞ YAP ---
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      if (user.banned) {
        return res.status(403).json({ message: "Hesabınız erişime engellenmiştir." });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Email veya şifre hatalı" });
    }
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

// --- PROFİL BİLGİSİ (ME) ---
exports.me = async (req, res) => {
  if (req.user) {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      credits: req.user.credits,
      banned: req.user.banned
    });
  } else {
    res.status(404).json({ message: "Kullanıcı bulunamadı" });
  }
};

// --- YENİ EKLENEN: PROFİL GÜNCELLEME ---
exports.updateDetails = async (req, res) => {
  try {
    // req.user, authMiddleware'den geliyor (Giriş yapmış kişi)
    const user = await User.findById(req.user._id);

    if (user) {
      // İsim güncelle
      user.name = req.body.name || user.name;
      
      // Email güncelle (Eğer değiştiyse ve başkası kullanmıyorsa)
      if (req.body.email && req.body.email !== user.email) {
        const emailExists = await User.findOne({ email: req.body.email });
        if (emailExists) {
          return res.status(400).json({ message: "Bu e-posta adresi zaten kullanılıyor." });
        }
        user.email = req.body.email;
      }

      // Şifre güncelle (Eğer boş değilse)
      if (req.body.password) {
        user.password = req.body.password; 
        // Not: User modelindeki 'pre save' hook'u şifreyi otomatik hash'leyecek.
      }

      const updatedUser = await user.save();

      // Güncel bilgileri ve yeni token'ı döndür
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        credits: updatedUser.credits,
        token: generateToken(updatedUser._id),
      });
    } else {
      res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Güncelleme başarısız oldu" });
  }
};
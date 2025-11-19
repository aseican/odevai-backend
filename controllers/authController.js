const User = require("../models/User");
const jwt = require("jsonwebtoken");

// Token Üretici (Kendi içinde olsun, dışarıya bağımlı kalmasın)
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d", // Oturum 30 gün açık kalsın
  });
};

// --- KAYIT OL ---
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    // 1. Basit doğrulama
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Lütfen tüm alanları doldurun" });
    }

    // 2. Kullanıcı zaten var mı?
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Bu email zaten kayıtlı" });
    }

    // 3. Kullanıcıyı oluştur (Modeldeki default:20 kredi otomatik işleyecek)
    const user = await User.create({
      name,
      email,
      password,
    });

    // 4. Başarılı yanıt dön
    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,      // Frontend bilsin (admin mi user mı?)
        credits: user.credits,// Frontend bilsin (kaç parası var?)
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

    // Kullanıcı varsa ve şifre doğruysa
    if (user && (await user.matchPassword(password))) {
      
      // YENİ: Ban kontrolü
      if (user.banned) {
        return res.status(403).json({ message: "Hesabınız erişime engellenmiştir." });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits, // Güncel krediyi gönderiyoruz
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Email veya şifre hatalı" });
    }
  } catch (error) {
    res.status(500).json({ message: "Sunucu hatası" });
  }
};

// --- BEN KİMİM? (Sayfa yenilenince çalışır) ---
exports.me = async (req, res) => {
  // req.user, authMiddleware'den geliyor
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
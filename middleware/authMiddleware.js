const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 1. KORUMA KALKANI (Giriş yapılmış mı?)
const protect = async (req, res, next) => {
  let token;

  // Header'da "Bearer asd876asd..." şeklinde token var mı bakıyoruz
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // "Bearer" kelimesini at, sadece şifreli kodu al
      token = req.headers.authorization.split(" ")[1];

      // Token'i çöz (İçindeki kullanıcı ID'sini bul)
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Veritabanından o kullanıcıyı bul ve isteğe ekle (Şifresi hariç)
      req.user = await User.findById(decoded.id).select("-password");

      next(); // Sorun yok, geçebilirsin
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: "Yetkisiz işlem, token geçersiz." });
    }
  }

  if (!token) {
    res.status(401).json({ message: "Giriş yapmanız gerekiyor." });
  }
};

// 2. ADMIN KONTROLÜ (Sadece Admin girebilir)
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next(); // Adminsen geç
  } else {
    res.status(403).json({ message: "Bu işlem için Admin yetkisi gerekli." });
  }
};

module.exports = { protect, admin };
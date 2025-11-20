const jwt = require("jsonwebtoken");
const User = require("../models/User");

// 1. KORUMA KALKANI (Giriş yapılmış mı?)
const protect = async (req, res, next) => {
  let token;

  // Header'da "Bearer ..." var mı?
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Token'ı al
      token = req.headers.authorization.split(" ")[1];

      // Token'ı çöz
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Kullanıcıyı bul
      req.user = await User.findById(decoded.id).select("-password");

      // EK GÜVENLİK: Token var ama kullanıcı silinmişse?
      if (!req.user) {
        return res.status(401).json({ message: "Kullanıcı bulunamadı, oturum geçersiz." });
      }

      return next(); // Sorun yok, devam et
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Yetkisiz işlem, token geçersiz." });
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Giriş yapmanız gerekiyor." });
  }
};

// 2. ADMIN KONTROLÜ (Sadece Admin girebilir)
const admin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next(); // Adminsen geç
  } else {
    return res.status(403).json({ message: "Bu işlem için Admin yetkisi gerekli." });
  }
};

module.exports = { protect, admin };
const User = require("../models/User");

// --- KREDİ KONTROLÜ (Giriş Kapısı) ---
// Bu fonksiyonu AI rotalarına koyacağız.
// "Paran var mı?" diye bakar.
exports.checkCredits = async (req, res, next) => {
  try {
    // req.user, authMiddleware'den geliyor
    const user = await User.findById(req.user._id);

    // Admin ise krediye bakma, geçiş serbest
    if (user.role === 'admin') {
      return next();
    }

    // Kredisi 1'den azsa durdur
    if (user.credits < 1) {
      return res.status(402).json({ 
        message: "Yetersiz bakiye! Devam etmek için kredi yükleyin.",
        errorType: "NO_CREDITS", // Frontend bunu anlayıp ödeme sayfasına yönlendirir
        currentCredits: user.credits
      });
    }

    // Kredisi varsa devam et
    next();

  } catch (error) {
    console.error("Kredi kontrol hatası:", error);
    res.status(500).json({ message: "Kredi kontrolü yapılamadı." });
  }
};

// --- KREDİ DÜŞME (Çıkış Kapısı) ---
// İşlem (AI çevirisi) başarılı olduktan sonra bunu çağıracağız.
exports.deductCredit = async (userId) => {
  try {
    // Krediyi 1 azalt
    await User.findByIdAndUpdate(userId, { $inc: { credits: -1 } });
  } catch (error) {
    console.error("Kredi düşülemedi:", error);
  }
};
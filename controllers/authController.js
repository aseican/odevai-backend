const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // EKLENDİ: Token işleme için
const sendEmail = require("../utils/sendEmail"); // EKLENDİ: Mail gönderme için

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

// --- PROFİL GÜNCELLEME ---
exports.updateDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      
      if (req.body.email && req.body.email !== user.email) {
        const emailExists = await User.findOne({ email: req.body.email });
        if (emailExists) {
          return res.status(400).json({ message: "Bu e-posta adresi zaten kullanılıyor." });
        }
        user.email = req.body.email;
      }

      if (req.body.password) {
        user.password = req.body.password; 
      }

      const updatedUser = await user.save();

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

// --- YENİ EKLENEN: ŞİFREMİ UNUTTUM (Mail Gönderir) ---
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      return res.status(404).json({ message: 'Bu email ile kayıtlı kullanıcı bulunamadı.' });
    }

    // Token oluştur (User modelindeki metodu kullanır)
    const resetToken = user.getResetPasswordToken();
    
    // Token'ı veritabanına kaydet
    await user.save({ validateBeforeSave: false });

    // Frontend Sıfırlama Linki
    const resetUrl = `https://odevai.pro/reset-password/${resetToken}`;

    const message = `
      <h2>Şifre Sıfırlama İsteği</h2>
      <p>Şifrenizi sıfırlamak için aşağıdaki linke tıklayın:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
      <p>Bu işlemi siz yapmadıysanız bu maili dikkate almayın.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Odevai - Şifre Sıfırlama',
        message,
      });

      res.status(200).json({ success: true, message: 'Sıfırlama maili gönderildi.' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      console.error("Mail hatası:", err);
      return res.status(500).json({ message: 'Email gönderilemedi.' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};

// --- YENİ EKLENEN: ŞİFRE SIFIRLAMA (Yeni Şifreyi Kaydeder) ---
exports.resetPassword = async (req, res) => {
  try {
    // URL'den gelen token'ı hashleyip veritabanındakiyle eşleştiriyoruz
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resetToken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }, // Süresi dolmamış olmalı
    });

    if (!user) {
      return res.status(400).json({ message: 'Geçersiz veya süresi dolmuş token.' });
    }

    // Yeni şifreyi ayarla
    user.password = req.body.password;
    
    // Tokenları temizle (Artık ihtiyaç yok)
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({ success: true, message: 'Şifre başarıyla güncellendi. Giriş yapabilirsiniz.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Sunucu hatası.' });
  }
};
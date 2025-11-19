const User = require("../models/User");

/* -------------------- 1) Admin Dashboard İstatistikleri -------------------- */
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // Bugün kayıt olanları bulalım
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: startOfDay } });

    res.json({
      totalUsers,
      newUsersToday,
      activeSystem: true
    });
  } catch (error) {
    res.status(500).json({ message: "İstatistikler alınamadı" });
  }
};

/* -------------------- 2) Kullanıcı Listesi -------------------- */
exports.getAllUsers = async (req, res) => {
  try {
    // En son kayıt olan en üstte görünsün (.sort)
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Kullanıcılar getirilemedi" });
  }
};

/* -------------------- 3) Kullanıcı Düzenle (Kredi, Ban, Rol) -------------------- */
// Senin eski 'updateCredits' fonksiyonunu geliştirdik.
// Artık tek fonksiyonla hem kredi verip, hem banlayıp, hem rol değiştirebilirsin.
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id; // Route'dan gelecek ID (/users/:id)
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

    // Gelen veriye göre güncelleme yap
    if (req.body.credits !== undefined) user.credits = req.body.credits;
    if (req.body.banned !== undefined) user.banned = req.body.banned;
    if (req.body.role) user.role = req.body.role;
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    const updatedUser = await user.save();
    res.json(updatedUser);

  } catch (error) {
    res.status(500).json({ message: "Kullanıcı güncellenemedi" });
  }
};

/* -------------------- 4) Prompt Güncelleme (Sisteme Özgü) -------------------- */
exports.updatePrompt = async (req, res) => {
  const { key, text } = req.body;

  try {
    // Tüm kullanıcıların prompt ayarını günceller
    await User.updateMany(
      {},
      { $set: { [`prompts.${key}`]: text } }
    );

    res.json({ message: "Prompt başarıyla güncellendi" });
  } catch (error) {
    res.status(500).json({ message: "Prompt güncellenemedi" });
  }
};

/* -------------------- 5) Özellik Aç/Kapa (Sisteme Özgü) -------------------- */
exports.updateFeatures = async (req, res) => {
  const { key, value } = req.body; // value: true/false

  try {
    // Tüm kullanıcıların ayarını değiştirir
    await User.updateMany(
      {},
      { $set: { [`settings.${key}`]: value } }
    );

    res.json({ message: "Ayar güncellendi" });
  } catch (error) {
    res.status(500).json({ message: "Ayar değiştirilemedi" });
  }
};
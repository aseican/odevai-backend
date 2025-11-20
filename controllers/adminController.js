const User = require("../models/User");

/* -------------------- 1) Admin Dashboard İstatistikleri -------------------- */
exports.getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // Bugün kayıt olanları bulalım
    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const newUsersToday = await User.countDocuments({ createdAt: { $gte: startOfDay } });

    // Sistemdeki toplam dağıtılan kredi miktarını hesapla
    const creditsResult = await User.aggregate([
      { $group: { _id: null, total: { $sum: "$credits" } } }
    ]);
    const totalCredits = creditsResult.length > 0 ? creditsResult[0].total : 0;

    res.json({
      totalUsers,
      newUsersToday,
      totalCredits, // Yeni eklenen özellik
      activeSystem: true
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "İstatistikler alınamadı" });
  }
};

/* -------------------- 2) Kullanıcı Listesi -------------------- */
exports.getAllUsers = async (req, res) => {
  try {
    // En son kayıt olan en üstte görünsün
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Kullanıcılar getirilemedi" });
  }
};

/* -------------------- 3) Kullanıcı Düzenle -------------------- */
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "Kullanıcı bulunamadı" });
    }

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

/* -------------------- 4) Prompt Güncelleme -------------------- */
exports.updatePrompt = async (req, res) => {
  const { key, text } = req.body;
  try {
    await User.updateMany({}, { $set: { [`prompts.${key}`]: text } });
    res.json({ message: "Prompt başarıyla güncellendi" });
  } catch (error) {
    res.status(500).json({ message: "Prompt güncellenemedi" });
  }
};

/* -------------------- 5) Özellik Aç/Kapa -------------------- */
exports.updateFeatures = async (req, res) => {
  const { key, value } = req.body;
  try {
    await User.updateMany({}, { $set: { [`settings.${key}`]: value } });
    res.json({ message: "Ayar güncellendi" });
  } catch (error) {
    res.status(500).json({ message: "Ayar değiştirilemedi" });
  }
};
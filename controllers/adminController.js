const User = require("../models/User");

/* -------------------- 1) Admin Dashboard İstatistikleri -------------------- */
exports.getStats = async (req, res) => {
  const totalUsers = await User.countDocuments();
  const totalCreditsUsed = 0; // istersen log ekleyince doldururuz
  const totalRequests = 0;
  const todayRequests = 0;

  res.json({
    totalUsers,
    totalCreditsUsed,
    totalRequests,
    todayRequests
  });
};

/* -------------------- 2) Kullanıcı listesi -------------------- */
exports.getUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
};

/* -------------------- 3) Kullanıcı kredi güncelleme -------------------- */
exports.updateCredits = async (req, res) => {
  const { userId, credits } = req.body;
  const user = await User.findByIdAndUpdate(userId, { credits }, { new: true });
  res.json(user);
};

/* -------------------- 4) Prompt güncelleme -------------------- */
exports.updatePrompt = async (req, res) => {
  const { key, text } = req.body;

  await User.updateMany(
    {},
    { $set: { [`prompts.${key}`]: text } }
  );

  res.json({ message: "Prompt güncellendi" });
};

/* -------------------- 5) Özellik aç/kapa -------------------- */
exports.updateFeatures = async (req, res) => {
  const { key, value } = req.body;

  await User.updateMany(
    {},
    { $set: { [`settings.${key}`]: value } }
  );

  res.json({ message: "Ayar güncellendi" });
};

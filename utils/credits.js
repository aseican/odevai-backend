const User = require("../models/User");

exports.consumeCredits = async (userId, amount) => {
  const user = await User.findById(userId);

  if (!user) {
    throw { status: 404, message: "Kullanıcı bulunamadı" };
  }

  // Admin ise kredi düşme
  if (user.role === "admin") {
    return user;
  }

  if (user.credits < amount) {
    throw { status: 402, message: "Yetersiz kredi! Lütfen yükleme yapın." };
  }

  user.credits -= amount;
  await user.save();
  
  return user;
};
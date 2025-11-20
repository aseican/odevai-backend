const Shopier = require("../utils/shopierAPI");
const Order = require("../models/Order");
const User = require("../models/User");

// API KEY Loglamak için
console.log("🟦 SHOPIER API KEY:", process.env.SHOPIER_API_KEY);
console.log("🟦 SHOPIER API SECRET:", process.env.SHOPIER_API_SECRET);

const shopier = new Shopier(
  process.env.SHOPIER_API_KEY,
  process.env.SHOPIER_API_SECRET
);

exports.startPayment = async (req, res) => {
  try {
    const { packageName, price, credits } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    const merchant_oid =
      "SHP-" + Date.now() + "-" + Math.floor(Math.random() * 999);

    await Order.create({
      user: user._id,
      merchant_oid,
      payment_amount: price,
      credit_amount: credits,
      packageName,
      status: "pending",
    });

    // 🔥 LOG → tam Shopier'e göndermeden önce
    console.log("🟩 PAYMENT STARTED → ORDER ID:", merchant_oid);

    const paymentHTML = shopier.generatePaymentHTML({
      orderId: merchant_oid,
      amount: price,
      productName: packageName,
      buyer: {
        id: user._id,
        name: user.name || "Kullanici",
        surname: "Musteri",
        email: user.email,
        phone: "05555555555",
      },
      callbackUrl: "https://api.odevai.pro/api/shopier/callback",
    });

    res.send(paymentHTML);
  } catch (err) {
    console.error("❌ Shopier Payment Error:", err);
    res.status(500).json({ message: "Ödeme başlatılamadı" });
  }
};

exports.paymentCallback = async (req, res) => {
  console.log("📩 CALLBACK ALINDI:", req.body);

  res.send("OK");
};

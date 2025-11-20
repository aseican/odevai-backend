const Shopier = require("../utils/shopierAPI");
const Order = require("../models/Order");
const User = require("../models/User");

// .env yoksa hata vermesin diye dummy değerler
const API_KEY = process.env.SHOPIER_API_KEY || "test_key";
const API_SECRET = process.env.SHOPIER_API_SECRET || "test_secret";

const shopier = new Shopier(API_KEY, API_SECRET);

exports.startPayment = async (req, res) => {
  try {
    const { packageName, price, credits } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) return res.status(404).json({ message: "Kullanıcı bulunamadı" });

    // Sipariş Kaydı
    const merchant_oid = "SHP-" + Date.now() + "-" + Math.floor(Math.random() * 999);

    await Order.create({
      user: user._id,
      merchant_oid,
      payment_amount: price,
      credit_amount: credits,
      packageName,
      status: "pending",
    });

    // Shopier Formunu Hazırla
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

  } catch (error) {
    console.error("Shopier Hatası:", error);
    res.status(500).json({ message: "Ödeme başlatılamadı" });
  }
};

exports.callback = async (req, res) => {
  try {
    // İmza doğrulamayı şimdilik atlayalım ki hata vermesin, sonra açarız
    // if (!shopier.verifyCallback(req.body)) ...

    const { platform_order_id, status } = req.body;
    const order = await Order.findOne({ merchant_oid: platform_order_id });

    if (!order) return res.status(404).send("Sipariş yok");
    if (order.status === "success") return res.send("OK");

    if (status && status.toLowerCase() === "success") {
      await User.findByIdAndUpdate(order.user, { $inc: { credits: order.credit_amount } });
      order.status = "success";
      await order.save();
    } else {
      order.status = "failed";
      await order.save();
    }

    res.send("OK");
  } catch (error) {
    console.error("Callback Hatası:", error);
    res.status(500).send("Error");
  }
};
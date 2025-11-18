const { createPaytrToken } = require('../services/paytrService');
const User = require('../models/User');
const CreditTransaction = require('../models/CreditTransaction');
const crypto = require('crypto');

const createPayment = async (req, res, next) => {
  try {
    const { packageId } = req.body;
    // Basit paket örnekleri
    const packages = {
      small: { credits: 20, price: 29 },
      medium: { credits: 50, price: 59 },
      large: { credits: 150, price: 119 }
    };
    const selected = packages[packageId];
    if (!selected) {
      return res.status(400).json({ message: 'Geçersiz paket' });
    }

    const user = req.user;
    const merchantOid = crypto.randomBytes(16).toString('hex');

    const token = await createPaytrToken({
      userId: user._id.toString(),
      email: user.email,
      amount: selected.price,
      merchantOid
    });

    res.json({
      token,
      merchantOid,
      price: selected.price,
      credits: selected.credits
    });
  } catch (err) {
    next(err);
  }
};

// PayTR bildirim callback (IPN)
const paytrCallback = async (req, res, next) => {
  try {
    const {
      merchant_oid,
      status,
      total_amount,
      hash,
      failed_reason_msg
    } = req.body;

    // Burada PayTR dokümantasyonuna göre hash doğrulaması yapmalısın.
    // Bu demo için detaylı doğrulama eklemedik, canlıya alırken mutlaka eklenmeli.

    if (status === 'success') {
      // TODO: merchant_oid üzerinden ilgili kullanıcıyı ve paketi bul
      // Şimdilik loglayalım
      console.log('Ödeme başarılı:', merchant_oid, total_amount);
    } else {
      console.log('Ödeme başarısız:', failed_reason_msg);
    }

    res.send('OK');
  } catch (err) {
    next(err);
  }
};

module.exports = { createPayment, paytrCallback };

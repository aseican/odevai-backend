const CryptoJS = require('crypto-js');
const axios = require('axios');

// Basit PayTR ödeme linki / iframe token servisi örneği (sandbox/test için uyarlaman gerekecek)
const createPaytrToken = async ({ userId, email, amount, merchantOid }) => {
  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

  if (!merchantId || !merchantKey || !merchantSalt) {
    throw new Error('PayTR ortam değişkenleri tanımlı değil');
  }

  const userIp = '127.0.0.1';
  const paymentAmount = Math.round(amount * 100); // Kuruş

  const hashStr =
    merchantId +
    userIp +
    email +
    paymentAmount +
    merchantOid +
    merchantSalt;

  const paytrToken = CryptoJS.HmacSHA256(hashStr, merchantKey).toString(
    CryptoJS.enc.Base64
  );

  const payload = {
    merchant_id: merchantId,
    user_ip: userIp,
    merchant_oid: merchantOid,
    email,
    payment_amount: paymentAmount,
    paytr_token: paytrToken,
    user_name: email,
    user_address: 'Adres',
    user_phone: '0000000000',
    merchant_ok_url: process.env.CLIENT_URL + '/payment/success',
    merchant_fail_url: process.env.CLIENT_URL + '/payment/fail',
    debug_on: 1,
    timeout_limit: 30,
    currency: 'TL',
    test_mode: 1 // Canlıya geçerken 0 yap
  };

  const res = await axios.post(
    'https://www.paytr.com/odeme/api/get-token',
    new URLSearchParams(payload).toString(),
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    }
  );

  if (res.data.status !== 'success') {
    throw new Error('PayTR token alınamadı: ' + res.data.reason);
  }

  return res.data.token;
};

module.exports = { createPaytrToken };

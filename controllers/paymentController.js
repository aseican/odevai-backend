const Order = require("../models/Order");
const User = require("../models/User");
const crypto = require("crypto");
// const request = require("request"); // Shopier kullanacağımız için buna gerek kalmayacak ama hata vermesin diye dursun

exports.startPayment = async (req, res) => {
  // Şimdilik placeholder (Shopier'e geçeceğiz)
  res.status(200).json({ message: "Ödeme sistemi hazırlanıyor..." });
};

exports.paymentCallback = async (req, res) => {
  res.send("OK");
};
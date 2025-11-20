const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  // 1) Hostinger Ayarlarıyla Postacı Oluşturuluyor
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com", // Hostinger SMTP sunucusu
    port: 465,                  // Güvenli Port
    secure: true,               // 465 portu için true olmalı
    auth: {
      user: "info@odevai.pro",  // Hostinger'da açtığın mail adresi
      pass: "Emrecansever1,",      // O mail için belirlediğin şifre
    },
  });

  // 2) Mail Seçeneklerini Ayarla
  const mailOptions = {
    from: "OdevAI Destek <info@odevai.pro>", // Gönderen kısmında bu görünecek
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  // 3) Maili Gönder
  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
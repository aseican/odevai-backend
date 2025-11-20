const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    port: 587,                // 465 yerine 587 yaptık
    secure: false,            // 587 için false olmalı
    auth: {
      user: "info@odevai.pro", 
      pass: "SENIN_HOSTINGER_SIFREN", // Şifreni buraya tekrar yazmayı unutma!
    },
  });

  const mailOptions = {
    from: "OdevAI Destek <info@odevai.pro>",
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
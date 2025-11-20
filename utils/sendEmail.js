const { Resend } = require('resend');

// Resend API Anahtarını tırnak içine yapıştır:
const resend = new Resend('re_9dP3o3ix_Kts59mWiG8Q5qjEJB3n3ir2d'); 

const sendEmail = async (options) => {
  try {
    const data = await resend.emails.send({
      // Gönderen ismi ve adresi (Domain onaylanınca çalışır)
      from: 'OdevAI Destek <info@odevai.pro>', 
      to: options.email,
      subject: options.subject,
      html: options.message, 
    });

    console.log("Mail başarıyla gönderildi. ID:", data.id);
  } catch (error) {
    console.error("Mail gönderme hatası:", error);
    // Hata olsa bile kullanıcıya "Hata" dönmeyelim, loglayalım yeter.
  }
};

module.exports = sendEmail;
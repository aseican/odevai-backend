const crypto = require("crypto");

class Shopier {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = "https://www.shopier.com/ShowProduct/api_pay4.php";
  }

  generatePaymentHTML(order) {
    const {
      orderId,
      amount, // Örn: 50 (TL cinsinden)
      currency = 0, // 0: TL, 1: USD, 2: EUR
      buyer, // { id, name, surname, email, phone }
      callbackUrl,
      productName,
    } = order;

    // Rastgele sayı (Shopier ister)
    const randomNum = Math.floor(Math.random() * 9999999 + 1000000);

    // İmzalanacak veriler (Sıralama ÖNEMLİDİR)
    const args = {
      API_key: this.apiKey,
      website_index: 1, // Shopier panelinde "Kayıtlı Alan Adları"nda 1. sırada olduğundan emin ol!
      platform_order_id: orderId,
      product_name: productName,
      product_type: 0, // 0: Dijital Ürün
      buyer_name: buyer.name,
      buyer_surname: buyer.surname || "Kullanici",
      buyer_email: buyer.email,
      buyer_phone: "05555555555", // Shopier zorunlu tutar, dummy numara
      // buyer_account_age: 0, // Hata verebildiği için kaldırdık
      order_billing_country: "TR",
      order_billing_city: "Istanbul",
      order_billing_address: "Dijital Teslimat Mah. No:1",
      order_shipping_country: "TR",
      order_shipping_city: "Istanbul",
      order_shipping_address: "Dijital Teslimat Mah. No:1",
      total_order_value: amount,
      currency: currency,
      platform: 0,
      is_in_frame: 0,
      current_language: 0,
      modul_version: "1.0.4",
      random_nr: randomNum,
    };

    // İmza Oluşturma (Shopier Algoritması)
    const data = [
      args.API_key,
      args.website_index,
      args.platform_order_id,
      args.total_order_value,
      args.currency,
    ];
    
    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(data.join("") + randomNum)
      .digest("base64");

    args.signature = signature;
    args.callback = callbackUrl;

    // HTML Formu Oluştur (Otomatik Submit olan gizli form)
    return `
      <!doctype html>
      <html>
        <head><title>Secure Payment</title></head>
        <body>
          <form id="shopier_form" method="post" action="${this.baseUrl}">
            ${Object.keys(args)
              .map((key) => `<input type="hidden" name="${key}" value="${args[key]}">`)
              .join("")}
          </form>
          <script>document.getElementById("shopier_form").submit();</script>
        </body>
      </html>
    `;
  }

  // Callback İmza Doğrulama
  verifyCallback(body) {
    const { random_nr, platform_order_id, total_order_value, status } = body;
    const expectedSignature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(random_nr + platform_order_id + total_order_value + status)
      .digest("base64");

    return body.signature === expectedSignature;
  }
}

module.exports = Shopier;
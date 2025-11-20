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
      amount,
      currency = 0,
      buyer,
      callbackUrl,
      productName,
    } = order;

    const randomNum = Math.floor(Math.random() * 9999999 + 1000000);

    // ❗ RESMİ SHOPIER İMZASI — düzeltilmiş
    const signatureData =
      this.apiKey +
      orderId +
      productName;

    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(signatureData)
      .digest("hex"); // base64 DEĞİL!

    // ❗ Shopier PARAMETRELERİ DÜZELTİLDİ
    const args = {
      API_key: this.apiKey,
      website_index: 1, // panelde 1. sıradaysa doğru
      platform_order_id: orderId,

      // ❗ HATALI: total_order_value —> Doğru: product_price
      product_price: amount,

      product_name: productName,

      // ❗ Dijital ürün = 1
      product_type: 1,

      buyer_name: buyer.name,
      buyer_surname: buyer.surname || "Kullanici",
      buyer_email: buyer.email,
      buyer_phone: buyer.phone || "05555555555",

      order_billing_country: "TR",
      order_billing_city: "Istanbul",
      order_billing_address: "Dijital Teslimat Mahal. No:1",
      order_shipping_country: "TR",
      order_shipping_city: "Istanbul",
      order_shipping_address: "Dijital Teslimat Mahal. No:1",

      currency: currency,

      platform: 0,
      is_in_frame: 0,
      current_language: 0,
      modul_version: "1.0.4",
      random_nr: randomNum,

      signature,
      callback: callbackUrl,
    };

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

  verifyCallback(body) {
    const { random_nr, platform_order_id, product_price, status } = body;

    const expectedSignature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(
        this.apiKey +
        platform_order_id +
        body.product_name // Shopier callback için
      )
      .digest("hex");

    return body.signature === expectedSignature;
  }
}

module.exports = Shopier;

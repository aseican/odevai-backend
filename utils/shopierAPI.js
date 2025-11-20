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
      buyer,
      callbackUrl,
      productName,
    } = order;

    // ✔ Doğru signature datası
    const signatureString =
      this.apiKey +
      orderId +
      productName;

    const signature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(signatureString)
      .digest("hex");

    // ✔ Shopier’in kabul ettiği parametreler — Fazlası kaldırıldı
    const args = {
      API_key: this.apiKey,
      platform_order_id: orderId,
      product_name: productName,
      product_price: amount,
      product_type: 1, // Dijital ürün
      buyer_name: buyer.name,
      buyer_surname: buyer.surname || "Kullanici",
      buyer_email: buyer.email,
      buyer_phone: buyer.phone || "05555555555",
      callback: callbackUrl,
      signature: signature,
    };

    return `
      <!doctype html>
      <html>
        <head><title>Shopier Secure Payment</title></head>
        <body>
          <form id="shopier_form" method="post" action="${this.baseUrl}">
            ${Object.keys(args)
              .map((key) => `<input type="hidden" name="${key}" value="${args[key]}">`)
              .join("")}
          </form>
          <script>
            document.getElementById("shopier_form").submit();
          </script>
        </body>
      </html>
    `;
  }

  verifyCallback(body) {
    const expectedSignature = crypto
      .createHmac("sha256", this.apiSecret)
      .update(
        this.apiKey +
        body.platform_order_id +
        body.product_name
      )
      .digest("hex");

    return body.signature === expectedSignature;
  }
}

module.exports = Shopier;

const crypto = require("crypto");

class Shopier {
  constructor(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = "https://www.shopier.com/ShowProduct/api_pay4.php";
  }

  generatePaymentHTML(order) {
    const { orderId, amount, buyer, callbackUrl, productName } = order;
    const randomNum = Math.floor(Math.random() * 9999999 + 1000000);

    const args = {
      API_key: this.apiKey,
      website_index: 1,
      platform_order_id: orderId,
      product_name: productName,
      product_type: 0,
      buyer_name: buyer.name,
      buyer_surname: buyer.surname,
      buyer_email: buyer.email,
      buyer_phone: buyer.phone,
      buyer_account_age: 0,
      order_billing_country: "TR",
      order_billing_city: "Istanbul",
      order_billing_address: "Dijital Teslimat",
      order_shipping_country: "TR",
      order_shipping_city: "Istanbul",
      order_shipping_address: "Dijital Teslimat",
      total_order_value: amount,
      currency: 0,
      platform: 0,
      is_in_frame: 0,
      current_language: 0,
      modul_version: "1.0.4",
      random_nr: randomNum,
    };

    const data = [args.API_key, args.website_index, args.platform_order_id, args.total_order_value, args.currency];
    const signature = crypto.createHmac("sha256", this.apiSecret).update(data.join("") + randomNum).digest("base64");

    args.signature = signature;
    args.callback = callbackUrl;

    return `
      <!doctype html>
      <html>
        <head><title>Redirecting...</title></head>
        <body>
          <form id="shopier_form" method="post" action="${this.baseUrl}">
            ${Object.keys(args).map((key) => `<input type="hidden" name="${key}" value="${args[key]}">`).join("")}
          </form>
          <script>document.getElementById("shopier_form").submit();</script>
        </body>
      </html>
    `;
  }

  verifyCallback(body) {
    const { random_nr, platform_order_id, total_order_value, status } = body;
    const expectedSignature = crypto.createHmac("sha256", this.apiSecret).update(random_nr + platform_order_id + total_order_value + status).digest("base64");
    return body.signature === expectedSignature;
  }
}

module.exports = Shopier;
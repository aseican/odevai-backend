const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    merchant_oid: {
      type: String,
      required: true,
      unique: true, 
    },
    payment_amount: {
      type: Number,
      required: true,
    },
    credit_amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "success", "failed"],
      default: "pending",
    },
    packageName: {
      type: String,
      required: true,
    },
    failed_reason_msg: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
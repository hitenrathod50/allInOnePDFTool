// models/Otp.js
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 // ⏱️ auto delete after 60 sec
  }
});

module.exports = mongoose.model("Otp", otpSchema);
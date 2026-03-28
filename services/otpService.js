// services/otpService.js
const Otp = require("../models/Otp");

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

async function saveOtp(email, otp) {
  // delete old OTP for same email
  await Otp.deleteMany({ email });

  await Otp.create({ email, otp });
};

async function verifyOtp(email, otp) {
  const record = await Otp.findOne({ email, otp });
  return record;
};

module.exports = { generateOtp, saveOtp, verifyOtp }
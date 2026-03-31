// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: false
  },
  googleId: {
    type: String,
    default: null
  },

  provider: {
    type: String,
    default: "Local"
  },

  name: String,
  createdOn: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
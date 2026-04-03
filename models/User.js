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

  pdfData: {
    type: [
      {
        date: {
          type: Date,
          default: Date.now
        },
        url: {
          type: String,
          required: true
        }
      }
    ],
    default: []   // 👈 important (empty array by default)
  },

  name: String,
  createdOn: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("User", userSchema);
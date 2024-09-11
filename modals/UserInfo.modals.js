const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  accessToken: { type: String, required: true },
});

// Create a User model
const User = mongoose.model("User", userSchema);

module.exports = { User };

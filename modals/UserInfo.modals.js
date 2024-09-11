const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  linearUserId: { type: String, required: true, unique: true },
  accessToken: { type: String, required: true },
  refreshToken: { type: String },
  tokenExpiresAt: { type: Date },
  email: { type: String },
  name: { type: String },
  avatarUrl: { type: String },
  organizationId: { type: String },
  provider: { type: String, default: "linear" },
});

// Create a User model
const User = mongoose.model("User", userSchema);

module.exports = { User };

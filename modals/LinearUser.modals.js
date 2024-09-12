const mongoose = require("mongoose");

const linearSchema = new mongoose.Schema({
  linearUserId: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String },
  name: { type: String },
  email: { type: String },
});

// Create a User model
const LinearUser = mongoose.model("LinearUser", linearSchema);

module.exports = { LinearUser };

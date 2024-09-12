const mongoose = require("mongoose");

const linearSchema = new mongoose.Schema({
  accessToken: { type: String },
  email: { type: String },
  teamId: { type: String },
  teamName: { type: String },
  refreshToken: { type: String },
});

// Create a User model
const LinearUser = mongoose.model("LinearUser", linearSchema);

module.exports = { LinearUser };

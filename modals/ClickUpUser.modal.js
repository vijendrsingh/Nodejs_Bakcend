const mongoose = require("mongoose");
const integrationSchema = new mongoose.Schema({
  integrationName: { type: String, required: true },  // Name of the integration
  integrationDetails: { type: String }, // Additional details can be added here
});
const clickUpUserSchema = new mongoose.Schema({
  clickUpUserId: { type: String },
  email: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String },
  userName: { type: String },
  integrations: [integrationSchema],
});

const ClickUpUser = mongoose.model("ClickUpUser", clickUpUserSchema);

module.exports = { ClickUpUser };

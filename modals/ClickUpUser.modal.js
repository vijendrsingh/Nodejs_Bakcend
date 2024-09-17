const mongoose = require("mongoose");

const clickUpUserSchema = new mongoose.Schema({
  clickUpUserId: { type: String },
  email: { type: String },
  accessToken: { type: String },
  refreshToken: { type: String },
  userName: { type: String },
});

const ClickUpUser = mongoose.model("ClickUpUser", clickUpUserSchema);

module.exports = { ClickUpUser };

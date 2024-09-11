// models/SlackUser.js

const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SlackUserSchema = new Schema({
  access_token: { type: String, required: true },
  authed_user_id: { type: String, required: true },
  team_id: { type: String, required: true },
  channel_id: { type: String, required: true },
  webhook_url: { type: String, required: true },
  email: { type: String },
});

const SlackUser = mongoose.model("SlackUser", SlackUserSchema);

module.exports = { SlackUser };

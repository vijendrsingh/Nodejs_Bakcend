const mongoose = require("mongoose");

const jiraUserSchema = new mongoose.Schema({
  email: { type: String },
  jiraUserId: { type: String },
  access_token: { type: String },
});

const JiraUser = mongoose.model("JiraUser", jiraUserSchema);

module.exports = { JiraUser };

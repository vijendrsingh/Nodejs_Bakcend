const mongoose = require("mongoose");

const jiraTaskSchema = new mongoose.Schema({
  email: { type: String },
  taskId: { type: String },
  summary: { type: String },
  description: { type: String },
});

const JiraTask = mongoose.model("JiraTask", jiraTaskSchema);

module.exports = { JiraTask };

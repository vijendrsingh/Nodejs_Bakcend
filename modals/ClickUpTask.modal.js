const mongoose = require("mongoose");

const ClickUpTaskSchema = new mongoose.Schema({
  taskId: { type: String }, // ClickUp task ID
  title: { type: String }, // Task title
  description: { type: String }, // Task description
  email: { type: String }, // User email who created the task
  taskUrl: { type: String }, // URL to view the task in ClickUp
});

const ClickUpTask = mongoose.model("ClickUpTask", ClickUpTaskSchema);

module.exports = { ClickUpTask };

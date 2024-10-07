const mongoose = require("mongoose");
const integrationSchema = new mongoose.Schema({
  integrationName: { type: String, required: true },  // Name of the integration
  integrationDetails: { type: String }, // Additional details can be added here
});
const ClickUpTaskSchema = new mongoose.Schema({
  taskId: { type: String }, // ClickUp task ID
  name: { type: String }, // Task title
  description: { type: String }, // Task description
  email: { type: String }, // User email who created the task
  taskUrl: { type: String }, // URL to view the task in ClickUp
  integrations: [integrationSchema],
});

const ClickUpTask = mongoose.model("ClickUpTask", ClickUpTaskSchema);

module.exports = { ClickUpTask };

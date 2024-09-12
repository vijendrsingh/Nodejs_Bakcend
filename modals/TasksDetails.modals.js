const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  email: { type: String, required: true },
  access_token: { type: String, required: true },
});

const TaskDetails = mongoose.model("TaskDetails", TaskSchema);

module.exports = TaskDetails;

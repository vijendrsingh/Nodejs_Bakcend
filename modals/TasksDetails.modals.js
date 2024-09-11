const mongoose = require("mongoose");

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  userEmail: { type: String, required: true },
  accessTokenGet: { type: Date, required: true },
});

const TaskDetails = mongoose.model("TaskDetails", TaskSchema);

module.exports = TaskDetails;

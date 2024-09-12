const mongoose = require("mongoose");

const linearSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  email: { type: String, required: true },
});

const LinearUserTask = mongoose.model("LinearUserTask", linearSchema);

module.exports = { LinearUserTask };

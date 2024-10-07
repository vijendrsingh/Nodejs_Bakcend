const mongoose = require("mongoose");

// Create an integration schema
const integrationSchema = new mongoose.Schema({
  integrationName: { type: String, required: true },  // Name of the integration
  integrationDetails: { type: String }, // Additional details can be added here
});

const linearSchema = new mongoose.Schema({
  linearUserId: { type: String },
  access_token: { type: String },
  name: { type: String },
  email: { type: String },
  integrations: [integrationSchema], 
});

// Create a User model
const LinearUser = mongoose.model("LinearUser", linearSchema);

module.exports = { LinearUser };

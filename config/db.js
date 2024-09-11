const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();
console.log(process.env.MONGODB_URL);
const connectionToDB = mongoose.connect(process.env.MONGODB_URL);

module.exports = { connectionToDB };

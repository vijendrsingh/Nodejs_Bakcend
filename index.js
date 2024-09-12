const express = require("express");
const { connectionToDB } = require("./config/db");
require("dotenv").config();
const { slackRouter } = require("./routes/Slack.routes");
const { linearRoutes } = require("./routes/Linear.routes");



const app = express();
const port = 3000;

app.use(express.json());
app.use("/", slackRouter);
app.use("/", linearRoutes);
app.get("/", async (req, res) => {
  res.send("home page for slack");
});



app.listen(port, async () => {
  try {
    await connectionToDB
      .then((res) => console.log("Mongo db is connected"))
      .catch((error) => console.log("Mongo db have problem", error));
    console.log(`server is running on port 3000`);
  } catch (error) {
    console.log(error, "error");
  }
});

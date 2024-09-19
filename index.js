const express = require("express");
const { connectionToDB } = require("./config/db");
const { slackRouter } = require("./routes/Slack.routes");
const { linearRoutes } = require("./routes/Linear.routes");
const { clickupRoutes } = require("./routes/Clickup.routes");
const cors = require("cors");
const jiraRoutes = require("./routes/Jira.routes");
const app = express();
const port = 3000;

app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173", // Your frontend for local development
      "http://localhost:5174", // Any other local frontend domain
      "https://app.getaligned.work", // Your production frontend domain
      "https://stage-app.getaligned.work", // Staging domain if applicable
      "https://mail.google.com",
      "https://api.getaligned.work",
      "https://extension.getaligned.work",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // Specify methods
    allowedHeaders: ["Content-Type", "Authorization"], // Specify allowed headers
    credentials: true, // Allow cookies and credentials if required
  })
);
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*"); // Echo origin or use wildcard '*'
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200); // Respond to preflight
  }

  next();
});

app.use("/", slackRouter);
app.use("/", linearRoutes);
app.use("/", clickupRoutes);
app.use("/",jiraRoutes)

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

const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
const port = 3000;

// In-memory store for users (Replace with a real database in production)
const users = {};

// Middleware to parse JSON bodies (for handling POST requests)
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("home page for slack");
});

// Route to handle Slack OAuth redirect
app.get("/slack/oauth_redirect", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send("Authorization code is missing");
  }
  console.log(code, "code I have here!!!");
  try {
    // Exchange the authorization code for an access token
    const response = await axios.post(
      "https://slack.com/api/oauth.v2.access",
      null,
      {
        params: {
          client_id: process.env.SLACK_CLIENT_ID,
          client_secret: process.env.SLACK_CLIENT_SECRET,
          code: code,
          redirect_uri: process.env.SLACK_REDIRECT_URI,
        },
      }
    );

    const { access_token, authed_user, team } = response.data;
    console.log(response, "response data coming after hit this api");
    if (!access_token) {
      return res.status(400).send("Failed to obtain access token");
    }

    // Store user information in memory (replace with a database in production)
    users[authed_user.id] = {
      access_token,
      team_id: team.id,
      user_id: authed_user.id,
    };

    // Send a success response
    res.send("Authorization successful! You can now close this window.");
  } catch (error) {
    console.error("Error exchanging code for access token:", error);
    res.status(500).send("An error occurred during the authorization process");
  }
});

// Route to send a message to a Slack user
app.post("/send-message", async (req, res) => {
  const { userId, message } = req.body;

  const user = users[userId];
  if (!user) {
    return res.status(404).send("User not found");
  }

  try {
    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: user.user_id,
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${user.access_token}`,
        },
      }
    );

    res.send("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).send("Failed to send message");
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

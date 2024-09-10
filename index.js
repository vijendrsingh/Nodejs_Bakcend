const express = require("express");
const axios = require("axios");
// const { connectionToDB } = require("./config/db");
require("dotenv").config();
const querystring = require("querystring");

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

// Linear backedn integration

app.get("https://nodejs-bakcend.onrender.com/auth/linear", (req, res) => {
  const authUrl = "https://linear.app/oauth/authorize";
  const params = querystring.stringify({
    client_id: process.env.LINEAR_CLIENT_ID,
    redirect_uri: process.env.LINEAR_REDIRECT_URI,
    response_type: "code",
    scope: "read write",
  });
  console.log(authUrl, "auth Url ");
  console.log(params, "params");
  // Redirect the user to Linear's authorization page
  res.redirect(`${authUrl}?${params}`);
});

// Step 2: Callback URL to capture authorization code
app.get("/callback/auth/linear", async (req, res) => {
  const { code } = req.query;
  console.log(code, "getting code ");
  if (!code) {
    return res.status(400).send("Authorization code missing.");
  }

  try {
    // Step 3: Exchange authorization code for access token
    const tokenUrl = "https://api.linear.app/oauth/token";
    const tokenData = {
      grant_type: "authorization_code",
      code: code,
      redirect_uri: process.env.LINEAR_REDIRECT_URI,
      client_id: process.env.LINEAR_CLIENT_ID,
      client_secret: process.env.LINEAR_CLIENT_SECRET,
    };

    const tokenResponse = await axios.post(
      tokenUrl,
      querystring.stringify(tokenData),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );
    console.log(tokenResponse, "respone from the url");
    const accessToken = tokenResponse.data.access_token;

    // Store or use the access token (you could save it in the session or database)
    res.send(`Access token: ${accessToken}`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to get access token.");
  }
});

// Start the Express server
app.listen(port, () => {
  console.log(`server is running on port 3000`);
});

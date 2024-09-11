const express = require("express");
const axios = require("axios");
const { connectionToDB } = require("./config/db");
require("dotenv").config();
const querystring = require("querystring");
const { User } = require("./modals/UserInfo.modals");
const { SlackUser } = require("./modals/SlackUser.modals");

const app = express();
const port = 3000;

// In-memory store for users (Replace with a real database in production)
const users = {};
let access_token_one;
let linear_token_one;

// Middleware to parse JSON bodies (for handling POST requests)
app.use(express.json());

app.get("/", async (req, res) => {
  res.send("home page for slack");
});

// Route to handle Slack OAuth redirect
// app.get("/slack/oauth_redirect", async (req, res) => {
//   const { code } = req.query;

//   if (!code) {
//     return res.status(400).send("Authorization code is missing");
//   }
//   console.log(code, "code I have here!!!");
//   try {
//     // Exchange the authorization code for an access token
//     const response = await axios.post(
//       "https://slack.com/api/oauth.v2.access",
//       null,
//       {
//         params: {
//           client_id: process.env.SLACK_CLIENT_ID,
//           client_secret: process.env.SLACK_CLIENT_SECRET,
//           code: code,
//           redirect_uri: process.env.SLACK_REDIRECT_URI,
//         },
//       }
//     );

//     const { access_token, authed_user, team } = response.data;
//     access_token_one = response.data.access_oken;
//     console.log(response, "response data coming after hit this api");
//     if (!access_token) {
//       return res.status(400).send("Failed to obtain access token");
//     }

//     // Store user information in memory (replace with a database in production)
//     users[authed_user.id] = {
//       access_token,
//       team_id: team.id,
//       user_id: authed_user.id,
//     };

//     // Send a success response
//     res.send("Authorization successful! You can now close this window.");
//   } catch (error) {
//     console.error("Error exchanging code for access token:", error);
//     res.status(500).send("An error occurred during the authorization process");
//   }
// });
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

    const { access_token, authed_user, team, incoming_webhook } = response.data;
    const { channel, url: webhook_url } = incoming_webhook;

    if (!access_token) {
      return res.status(400).send("Failed to obtain access token");
    }

    const userInfoResponse = await axios.get(
      `https://slack.com/api/users.info?user=${authed_user.id}`,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    const { user } = userInfoResponse.data;
    console.log(userInfoResponse.data, "user info details");

    const userEmail = user.profile.email;

    // Store the details in MongoDB
    const slackUser = new SlackUser({
      access_token,
      authed_user_id: authed_user.id,
      team_id: team.id,
      channel_id: channel, // Slack channel where the app is installed
      webhook_url, // Webhook URL to send notifications
      email: userEmail,
    });

    await slackUser.save();

    console.log("User data stored in MongoDB:", slackUser);

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

  // const user = users[userId];
  // if (!user) {
  //   return res.status(404).send("User not found");
  // }

  try {
    await axios.post(
      "https://slack.com/api/chat.postMessage",
      {
        channel: userId,
        text: message,
      },
      {
        headers: {
          Authorization: `Bearer ${access_token_one}`,
        },
      }
    );

    res.send("Message sent successfully");
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).send("Failed to send message");
  }
});

app.post("/notify-task", async (req, res) => {
  const { title, description, webhookUrl } = req.body;

  if (!title || !webhookUrl) {
    return res.status(400).send("Task title and webhook URL are required.");
  }

  try {
    await axios.post(webhookUrl, {
      text: `A new task has been created: *${title}* \nDescription: ${
        description || "No description"
      }`,
    });

    res.send("Notification sent to Slack successfully.");
  } catch (error) {
    console.error("Error sending message to Slack:", error);
    res.status(500).send("Failed to send message to Slack.");
  }
});

// Linear backedn integration

app.get("/auth/linear", (req, res) => {
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

    console.log(tokenResponse.data, "response from the token URL");
    const {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    } = tokenResponse.data;

    console.log(accessToken, "access token coming ");
    const userInfo = new User({
      accessToken,
    });
    await userInfo.save();
    res.send(`User info stored for ${accessToken}`);
  } catch (error) {
    console.error("Error during OAuth callback:", error);
    res.status(500).send("Failed to authenticate user.");
  }
});

app.get("/get-teams", async (req, res) => {
  const { accessToken } = req.query;

  if (!accessToken) {
    return res.status(400).send("Access token is required.");
  }

  try {
    // Fetch teams from Linear API
    const response = await axios.post(
      "https://api.linear.app/graphql",
      {
        query: `
          query {
            teams {
              nodes {
                id
                name
              }
            }
          }
        `,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    // Handle the response
    const { data } = response;
    console.log(data, "team id Data");
    res.send(data.data.teams.nodes);
  } catch (error) {
    console.error("Error fetching teams:", error);
    res.status(500).send("Failed to fetch teams.");
  }
});

app.post("/create-task", async (req, res) => {
  const { accessToken, title, description, teamId } = req.body;

  if (!accessToken || !title) {
    return res.status(400).send("Access token and title are required.");
  }

  try {
    const response = await axios.post(
      "https://api.linear.app/graphql",
      {
        query: `
          mutation {
            issueCreate(input: {
              title: "${title}",
              description: "${description || ""}",
              teamId: "${teamId || ""}"
            }) {
              success
              issue {
                id
                title
                description
              }
            }
          }
        `,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const { data } = response;
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    res.send(data.data.issueCreate.issue);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).send("Failed to create task.");
  }
});

// Start the Express server
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
